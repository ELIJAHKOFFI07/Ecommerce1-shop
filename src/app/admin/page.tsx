import { createClient } from "@/lib/backend/server";
import type { Order, RevenueDay, ShopRevenue } from "@/lib/types";
import { statusDistribution } from "@/lib/stats";
import { DashboardCharts } from "./DashboardCharts";
import type { DashboardData } from "./DashboardCharts";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function AdminDashboard() {
  const supabase = await createClient();

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);

  const [statsRes, revenueRes, shopRes, ordersRes] = await Promise.all([
    supabase.rpc("admin_stats"),
    supabase.rpc("admin_revenue_report", {
      p_from: isoDate(from),
      p_to: isoDate(to),
    }),
    supabase.rpc("admin_shop_revenue", {
      p_from: isoDate(from),
      p_to: isoDate(to),
    }),
    supabase.from("orders").select("status").limit(1000),
  ]);

  const stats = (statsRes.data ?? {}) as DashboardData["stats"];
  const days = (revenueRes.data as RevenueDay[]) ?? [];
  const shops = (shopRes.data as ShopRevenue[]) ?? [];
  const orders = (ordersRes.data as Pick<Order, "status">[]) ?? [];

  // Série continue sur 30 jours : sans les jours vides, la courbe
  // écraserait les creux et laisserait croire à une activité continue.
  const byDay = new Map(days.map((d) => [d.day.slice(0, 10), d]));
  const revenueByDay: DashboardData["revenueByDay"] = [];
  const ordersByDay: number[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const key = isoDate(d);
    const row = byDay.get(key);
    revenueByDay.push({
      label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      value: Number(row?.gmv ?? 0),
    });
    ordersByDay.push(Number(row?.orders_count ?? 0));
  }

  const data: DashboardData = {
    stats: {
      users: stats.users ?? 0,
      shops: stats.shops ?? 0,
      products: stats.products ?? 0,
      orders: stats.orders ?? 0,
      gmv: stats.gmv ?? 0,
      open_reports: stats.open_reports ?? 0,
    },
    revenueByDay,
    ordersByDay,
    statusSlices: statusDistribution(orders),
    // Au-delà de six entrées, un classement se lit mieux en tableau : la
    // vue tableau de la carte porte la liste complète.
    topShops: shops
      .slice(0, 6)
      .map((s) => ({ label: s.shop_name, value: Number(s.gmv) })),
    commissionTotal: days.reduce((sum, d) => sum + Number(d.commission ?? 0), 0),
  };

  const error = statsRes.error;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-medium tracking-tight">Tableau de bord</h1>
      {error && (
        <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error.message}
        </p>
      )}
      <DashboardCharts data={data} />
    </div>
  );
}
