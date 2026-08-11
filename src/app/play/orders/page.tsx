"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/backend/client";
import { ORDER_STATUS_LABELS, formatFcfa, type Order } from "@/lib/types";
import { HeaderSkeleton, ListSkeleton } from "@/components/Skeleton";
import { MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/play/PageHeader";

/// Lien wa.me pré-rempli : le vendeur reçoit le détail de la commande
/// directement, sans ressaisie. Le numéro est normalisé (wa.me n'accepte que
/// des chiffres, indicatif compris).
function whatsappLink(number: string, order: Order): string {
  const digits = number.replace(/\D/g, "");
  const items = (order.order_items ?? [])
    .map((it) => `- ${it.quantity} x ${it.title}`)
    .join("\n");
  const text = [
    `Bonjour, je viens de passer la commande #${order.id.slice(0, 8).toUpperCase()} sur DreamTeamShop.`,
    items,
    `Total : ${formatFcfa(order.total)}`,
  ]
    .filter(Boolean)
    .join("\n");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function OrdersInner() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pickupCodes, setPickupCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*), shops(*)")
        .order("created_at", { ascending: false });
      const list = (data as Order[]) ?? [];
      setOrders(list);

      // Codes de retrait des commandes expédiées (lisibles par l'acheteur
      // uniquement, RLS).
      const shippedIds = list.filter((o) => o.status === "shipped").map((o) => o.id);
      if (shippedIds.length > 0) {
        const { data: codes } = await supabase
          .from("order_pickup_codes")
          .select("order_id, code")
          .in("order_id", shippedIds);
        setPickupCodes(
          Object.fromEntries(
            ((codes ?? []) as { order_id: string; code: string }[]).map((c) => [
              c.order_id,
              c.code,
            ]),
          ),
        );
      }
    })();
  }, []);

  // Tant que l'état d'authentification n'est pas connu, on affiche les
  // shimmers : sans ce garde, la page rendait sa mise en page complète avec
  // des données vides, qui disparaissaient dès l'arrivée des vraies.
  if (authed === null) {
    return (
      <div className="space-y-6">
        <HeaderSkeleton />
        <ListSkeleton count={4} />
      </div>
    );
  }

  if (authed === false) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium">Connexion requise</p>
        <Link
          href="/play/login"
          className="mt-4 inline-block rounded-full bg-accent px-6 py-2.5 font-semibold text-on-accent"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Mes commandes" />{orders.length === 0 ? (
        <p className="py-12 text-center text-muted">Aucune commande.</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {orders.map((o) => (
            <div
              key={o.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  #{o.id.slice(0, 8).toUpperCase()}
                </span>
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                  {ORDER_STATUS_LABELS[o.status]}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {o.shops?.name} · {formatFcfa(o.total)}
              </p>
              <div className="mt-2 text-sm text-muted">
                {o.order_items?.map((it) => (
                  <p key={it.id}>
                    {it.quantity} × {it.title}
                  </p>
                ))}
              </div>

              {o.shops?.whatsapp && (
                <a
                  href={whatsappLink(o.shops.whatsapp, o)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:border-accent"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-accent" />
                  Prévenir le vendeur sur WhatsApp
                </a>
              )}
              {pickupCodes[o.id] && (
                <div className="mt-3 rounded-lg border border-accent bg-accent/10 p-3 text-center">
                  <p className="text-xs font-semibold">Votre code de retrait</p>
                  <p className="text-2xl font-bold tracking-[0.4em] text-accent">
                    {pickupCodes[o.id]}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    À donner au vendeur uniquement à la réception du colis.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <HeaderSkeleton />
          <ListSkeleton count={4} />
        </div>
      }
    >
      <OrdersInner />
    </Suspense>
  );
}
