import { createClient } from "@/lib/supabase/server";
import { formatFcfa, type Product } from "@/lib/types";
import { AdminProductRow } from "./AdminProductRow";

export default async function AdminProducts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, shops(*)")
    .order("created_at", { ascending: false })
    .limit(100);
  const products = (data as Product[]) ?? [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Produits ({products.length})</h1>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-muted">
            <tr>
              <th className="p-3">Titre</th>
              <th className="p-3">Boutique</th>
              <th className="p-3">Prix</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="max-w-xs truncate p-3">{p.title}</td>
                <td className="p-3 text-muted">{p.shops?.name}</td>
                <td className="p-3">{formatFcfa(p.price)}</td>
                <td className="p-3">{p.stock}</td>
                <td className="p-3">{p.status}</td>
                <td className="p-3">
                  <AdminProductRow
                    id={p.id}
                    status={p.status}
                    price={p.price}
                    stock={p.stock}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
