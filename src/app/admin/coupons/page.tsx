import { createClient } from "@/lib/backend/server";
import { NewCouponForm } from "./NewCouponForm";

type Coupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  min_order_amount: number;
  used_count: number;
  max_uses: number | null;
  active: boolean;
};

export default async function AdminCoupons() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("coupons")
    .select("*")
    .order("code");
  const coupons = (data as Coupon[]) ?? [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-medium tracking-tight">Coupons</h1>
      <NewCouponForm />
      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-muted">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Type</th>
              <th className="p-3">Valeur</th>
              <th className="p-3">Min.</th>
              <th className="p-3">Utilisations</th>
              <th className="p-3">Actif</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-mono font-bold text-accent">{c.code}</td>
                <td className="p-3">{c.type}</td>
                <td className="p-3">
                  {c.type === "percent" ? `${c.value}%` : `${c.value} FCFA`}
                </td>
                <td className="p-3">{c.min_order_amount}</td>
                <td className="p-3">
                  {c.used_count}
                  {c.max_uses ? ` / ${c.max_uses}` : ""}
                </td>
                <td className="p-3">{c.active ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
