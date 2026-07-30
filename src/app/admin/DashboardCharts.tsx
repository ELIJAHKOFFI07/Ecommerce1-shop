"use client";

import {
  AreaChart,
  BarList,
  ChartCard,
  DonutChart,
  Sparkline,
  type Point,
  type Slice,
} from "@/components/charts/Charts";
import { formatFcfa, ORDER_STATUS_LABELS, type Order } from "@/lib/types";

export type DashboardData = {
  stats: {
    users: number;
    shops: number;
    products: number;
    orders: number;
    gmv: number;
    open_reports: number;
  };
  revenueByDay: Point[];
  ordersByDay: number[];
  statusSlices: Slice[];
  topShops: Slice[];
  commissionTotal: number;
};

export function DashboardCharts({ data }: { data: DashboardData }) {
  const { stats, revenueByDay, ordersByDay, statusSlices, topShops } = data;

  return (
    <div className="space-y-6">
      {/* Chiffres de tête : le nombre EST le graphique, pas besoin d'en
          faire un camembert à une part. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Volume d'affaires"
          value={formatFcfa(stats.gmv)}
          spark={revenueByDay.map((d) => d.value)}
          accent
        />
        <StatTile
          label="Commandes"
          value={String(stats.orders)}
          spark={ordersByDay}
        />
        <StatTile label="Utilisateurs" value={String(stats.users)} />
        <StatTile
          label="Commission encaissée"
          value={formatFcfa(data.commissionTotal)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SmallTile label="Boutiques" value={stats.shops} />
        <SmallTile label="Produits actifs" value={stats.products} />
        <SmallTile
          label="Signalements ouverts"
          value={stats.open_reports}
          alert={stats.open_reports > 0}
        />
      </div>

      <ChartCard
        title="Chiffre d'affaires"
        subtitle="Commandes livrées, 30 derniers jours"
        table={{
          headers: ["Jour", "Chiffre d'affaires"],
          rows: revenueByDay.map((d) => [d.label, formatFcfa(d.value)]),
        }}
      >
        <AreaChart data={revenueByDay} formatValue={formatFcfa} />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Statut des commandes"
          subtitle="Répartition de toutes les commandes"
          table={{
            headers: ["Statut", "Commandes"],
            rows: statusSlices.map((s) => [s.label, s.value]),
          }}
        >
          <DonutChart data={statusSlices} centerLabel="commandes" />
        </ChartCard>

        <ChartCard
          title="Meilleures boutiques"
          subtitle="Chiffre d'affaires livré, 30 derniers jours"
          table={{
            headers: ["Boutique", "Chiffre d'affaires"],
            rows: topShops.map((s) => [s.label, formatFcfa(s.value)]),
          }}
        >
          <BarList data={topShops} formatValue={formatFcfa} />
        </ChartCard>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  spark,
  accent = false,
}: {
  label: string;
  value: string;
  spark?: number[];
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-gold/40">
      <p className="text-sm text-muted">{label}</p>
      {/* Chiffres proportionnels : tabular-nums fait « flotter » un grand
          nombre isolé. Réservé aux colonnes qui s'alignent. */}
      <p
        className={`mt-1.5 text-2xl font-bold ${accent ? "text-gold" : ""}`}
      >
        {value}
      </p>
      {spark && spark.length > 1 && (
        <div className="mt-3">
          <Sparkline values={spark} />
        </div>
      )}
    </div>
  );
}

function SmallTile({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
      <span className="text-sm text-muted">{label}</span>
      <span
        className={`text-lg font-bold ${alert ? "text-[var(--viz-2)]" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

/// Regroupe les commandes par statut, en conservant l'ordre du cycle de vie
/// plutôt qu'un tri par volume : la couleur suit le statut, pas son rang.
export function statusDistribution(orders: Pick<Order, "status">[]): Slice[] {
  const order: Order["status"][] = [
    "pending",
    "confirmed",
    "preparing",
    "shipped",
    "delivered",
    "cancelled",
  ];
  const counts = new Map<string, number>();
  let others = 0;
  for (const o of orders) {
    if (order.includes(o.status)) {
      counts.set(o.status, (counts.get(o.status) ?? 0) + 1);
    } else {
      others += 1;
    }
  }
  const slices = order
    .filter((s) => (counts.get(s) ?? 0) > 0)
    .map((s) => ({ label: ORDER_STATUS_LABELS[s], value: counts.get(s)! }));
  if (others > 0) slices.push({ label: "Autres", value: others });
  return slices;
}
