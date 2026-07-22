import { createClient } from "@/lib/supabase/server";
import { formatFcfa } from "@/lib/types";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_stats");

  const stats = (data ?? {}) as {
    users?: number;
    shops?: number;
    products?: number;
    orders?: number;
    gmv?: number;
    open_reports?: number;
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Tableau de bord</h1>
      {error && (
        <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error.message}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Utilisateurs" value={String(stats.users ?? 0)} />
        <StatCard label="Boutiques" value={String(stats.shops ?? 0)} />
        <StatCard label="Produits actifs" value={String(stats.products ?? 0)} />
        <StatCard label="Commandes" value={String(stats.orders ?? 0)} />
        <StatCard label="Volume d'affaires" value={formatFcfa(stats.gmv ?? 0)} />
        <StatCard
          label="Signalements ouverts"
          value={String(stats.open_reports ?? 0)}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gold">{value}</p>
    </div>
  );
}
