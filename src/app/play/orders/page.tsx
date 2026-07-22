"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ORDER_STATUS_LABELS, formatFcfa, type Order } from "@/lib/types";

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

  if (authed === false) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium">Connexion requise</p>
        <Link
          href="/play/login"
          className="mt-4 inline-block rounded-full bg-gold px-6 py-2.5 font-semibold text-black"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Mes commandes</h1>
      {orders.length === 0 ? (
        <p className="py-12 text-center text-muted">Aucune commande.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div
              key={o.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  #{o.id.slice(0, 8).toUpperCase()}
                </span>
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold">
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
              {pickupCodes[o.id] && (
                <div className="mt-3 rounded-lg border border-gold bg-gold/10 p-3 text-center">
                  <p className="text-xs font-semibold">Votre code de retrait</p>
                  <p className="text-2xl font-bold tracking-[0.4em] text-gold">
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
    <Suspense fallback={<p className="py-12 text-center text-muted">…</p>}>
      <OrdersInner />
    </Suspense>
  );
}
