"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { formatFcfa, type Order } from "@/lib/types";
import { HeaderSkeleton, ListSkeleton } from "@/components/Skeleton";

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await createClient()
        .from("orders")
        .select(
          "*, order_items(*), shops(*), profiles!orders_buyer_id_fkey(*)",
        )
        .eq("id", id)
        .maybeSingle();
      setOrder(data as Order | null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="space-y-6"><HeaderSkeleton /><ListSkeleton count={5} /></div>;
  if (!order) return <p className="py-16 text-center text-muted">Commande introuvable.</p>;

  const address = order.address_snapshot as Record<string, string>;
  const invoiceNumber = `DTS-${order.id.slice(0, 8).toUpperCase()}`;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href="/admin/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Factures
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black"
        >
          <Printer className="h-4 w-4" /> Imprimer / PDF
        </button>
      </div>

      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-8 text-sm print:border-0 print:bg-white print:text-black">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xl font-bold text-gold print:text-black">DreamTeamShop</p>
            <p className="text-muted">La marketplace sociale de Côte d&apos;Ivoire</p>
          </div>
          <div className="text-right">
            <p className="font-bold">FACTURE</p>
            <p className="text-muted">{invoiceNumber}</p>
            <p className="text-muted">
              {new Date(order.created_at).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6">
          <div>
            <p className="mb-1 font-semibold text-muted">Vendeur</p>
            <p className="font-medium">{order.shops?.name}</p>
            <p className="text-muted">{order.shops?.city}</p>
            <p className="text-muted">{order.shops?.phone}</p>
          </div>
          <div>
            <p className="mb-1 font-semibold text-muted">Client</p>
            <p className="font-medium">
              {address?.full_name ?? order.profiles?.full_name ?? order.profiles?.username}
            </p>
            <p className="text-muted">{address?.phone}</p>
            <p className="text-muted">
              {address?.city} — {address?.details}
            </p>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-2">Article</th>
              <th className="pb-2 text-right">Qté</th>
              <th className="pb-2 text-right">PU</th>
              <th className="pb-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items?.map((item) => (
              <tr key={item.id} className="border-b border-border/50">
                <td className="py-2">
                  {item.title}
                  {item.variant_name ? ` — ${item.variant_name}` : ""}
                </td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">{formatFcfa(item.unit_price)}</td>
                <td className="py-2 text-right">
                  {formatFcfa(item.unit_price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <div className="ml-auto mt-4 w-56 space-y-1">
          <div className="flex justify-between">
            <span className="text-muted">Sous-total</span>
            <span>{formatFcfa(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">
                Remise{order.coupon_code ? ` (${order.coupon_code})` : ""}
              </span>
              <span>- {formatFcfa(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted">Livraison</span>
            <span>{order.delivery_fee === 0 ? "Gratuite" : formatFcfa(order.delivery_fee)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1 font-bold">
            <span>Total</span>
            <span className="text-gold print:text-black">{formatFcfa(order.total)}</span>
          </div>
        </div>

        <p className="mt-8 text-xs text-muted">
          Paiement : {order.payment_method} —{" "}
          {order.payment_status === "paid" ? "réglé" : "en attente"}. Commission
          plateforme DreamTeamShop prélevée sur le montant vendeur, hors TVA
          (marketplace non assujettie). Document généré automatiquement, sans
          valeur fiscale contractuelle.
        </p>
      </div>
    </div>
  );
}
