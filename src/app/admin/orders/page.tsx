import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUS_LABELS, formatFcfa, type Order } from "@/lib/types";

export default async function AdminOrders() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, shops(*)")
    .order("created_at", { ascending: false })
    .limit(100);
  const orders = (data as Order[]) ?? [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Commandes ({orders.length})</h1>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-muted">
            <tr>
              <th className="p-3">Réf.</th>
              <th className="p-3">Boutique</th>
              <th className="p-3">Total</th>
              <th className="p-3">Paiement</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="p-3 font-mono">
                  #{o.id.slice(0, 8).toUpperCase()}
                </td>
                <td className="p-3 text-muted">{o.shops?.name}</td>
                <td className="p-3">{formatFcfa(o.total)}</td>
                <td className="p-3 text-muted">
                  {o.payment_method} · {o.payment_status}
                </td>
                <td className="p-3">{ORDER_STATUS_LABELS[o.status]}</td>
                <td className="p-3 text-muted">
                  {new Date(o.created_at).toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
