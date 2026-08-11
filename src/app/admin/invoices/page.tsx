"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { ORDER_STATUS_LABELS, formatFcfa, type Order } from "@/lib/types";
import { HeaderSkeleton, ListSkeleton } from "@/components/Skeleton";

export default function InvoicesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await createClient()
      .from("orders")
      .select("*, shops(*), profiles!orders_buyer_id_fkey(*)")
      .order("created_at", { ascending: false })
      .limit(200);
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const filtered = orders.filter(
    (o) =>
      !query ||
      o.id.toLowerCase().includes(query.toLowerCase()) ||
      o.shops?.name?.toLowerCase().includes(query.toLowerCase()),
  );

  if (loading) return <div className="space-y-6"><HeaderSkeleton /><ListSkeleton count={5} /></div>;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-medium tracking-tight">Factures</h1>
      <p className="mb-6 text-sm text-muted">
        Une facture par commande, imprimable ou exportable en PDF depuis le
        navigateur.
      </p>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher par n° de commande ou boutique…"
        className="mb-4 w-80 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      />

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-muted">
            <tr>
              <th className="p-3">N°</th>
              <th className="p-3">Date</th>
              <th className="p-3">Boutique</th>
              <th className="p-3">Total</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Paiement</th>
              <th className="p-3">Facture</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs">
                  #{o.id.slice(0, 8).toUpperCase()}
                </td>
                <td className="p-3 text-muted">
                  {new Date(o.created_at).toLocaleDateString("fr-FR")}
                </td>
                <td className="p-3">{o.shops?.name}</td>
                <td className="p-3">{formatFcfa(o.total)}</td>
                <td className="p-3">{ORDER_STATUS_LABELS[o.status]}</td>
                <td className="p-3 text-muted">
                  {o.payment_status === "paid" ? "Payé" : "En attente"}
                </td>
                <td className="p-3">
                  <Link
                    href={`/admin/invoices/${o.id}`}
                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    <Receipt className="h-3.5 w-3.5" /> Voir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
