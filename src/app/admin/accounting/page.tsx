"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/backend/client";
import { HeaderSkeleton, ListSkeleton } from "@/components/Skeleton";
import { AreaChart, BarList, ChartCard } from "@/components/charts/Charts";
import {
  formatFcfa,
  type PlatformSettings,
  type RevenueDay,
  type ShopRevenue,
  type WalletOverviewRow,
} from "@/lib/types";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function AccountingPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return isoDate(d);
  });
  const [to, setTo] = useState(() => isoDate(new Date()));
  const [revenue, setRevenue] = useState<RevenueDay[]>([]);
  const [shopRevenue, setShopRevenue] = useState<ShopRevenue[]>([]);
  const [wallets, setWallets] = useState<WalletOverviewRow[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data: rev }, { data: shops }, { data: wal }, { data: cfg }] = await Promise.all([
      supabase.rpc("admin_revenue_report", { p_from: from, p_to: to }),
      supabase.rpc("admin_shop_revenue", { p_from: from, p_to: to }),
      supabase.rpc("admin_wallets_overview"),
      supabase.from("platform_settings").select("*").maybeSingle(),
    ]);
    setRevenue((rev as RevenueDay[]) ?? []);
    setShopRevenue((shops as ShopRevenue[]) ?? []);
    setWallets((wal as WalletOverviewRow[]) ?? []);
    setSettings(cfg as PlatformSettings | null);
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const totals = useMemo(() => {
    return revenue.reduce(
      (acc, r) => ({
        gmv: acc.gmv + r.gmv,
        commission: acc.commission + r.commission,
        orders: acc.orders + r.orders_count,
      }),
      { gmv: 0, commission: 0, orders: 0 },
    );
  }, [revenue]);

  const totalWalletLiability = wallets.reduce((s, w) => s + w.balance, 0);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Comptabilité</h1>
      <p className="mb-6 text-sm text-muted">
        Commission actuelle : {settings?.commission_percent ?? 5} % — modifiable dans
        Réglages.
      </p>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted">Du</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Au</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </label>
      </div>

      {loading ? (
        <div className="space-y-6"><HeaderSkeleton /><ListSkeleton count={5} /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Volume d'affaires (GMV)" value={formatFcfa(totals.gmv)} />
            <StatCard
              label="Revenu plateforme (commission)"
              value={formatFcfa(totals.commission)}
            />
            <StatCard label="Commandes livrées" value={String(totals.orders)} />
            <StatCard
              label="Panier moyen"
              value={formatFcfa(totals.orders ? Math.round(totals.gmv / totals.orders) : 0)}
            />
          </div>

          {/* Les tableaux qui suivent portent chaque valeur : les graphiques
              donnent la forme, jamais l'accès exclusif au chiffre. */}
          {revenue.length > 0 && (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <ChartCard
                title="Chiffre d'affaires par jour"
                subtitle="Commandes livrées sur la période"
              >
                <AreaChart
                  data={revenue.map((r) => ({
                    label: new Date(r.day).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                    }),
                    value: Number(r.gmv),
                  }))}
                  formatValue={formatFcfa}
                />
              </ChartCard>

              <ChartCard
                title="Commission par jour"
                subtitle="Revenu encaissé par la plateforme"
              >
                <AreaChart
                  data={revenue.map((r) => ({
                    label: new Date(r.day).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                    }),
                    value: Number(r.commission),
                  }))}
                  formatValue={formatFcfa}
                />
              </ChartCard>
            </div>
          )}

          {shopRevenue.length > 0 && (
            <div className="mt-4">
              <ChartCard
                title="Répartition par boutique"
                subtitle="Six premières boutiques par chiffre d'affaires"
              >
                <BarList
                  data={shopRevenue
                    .slice(0, 6)
                    .map((s) => ({ label: s.shop_name, value: Number(s.gmv) }))}
                  formatValue={formatFcfa}
                />
              </ChartCard>
            </div>
          )}

          <h2 className="mb-3 mt-8 text-lg font-semibold">Revenu par jour</h2>
          {revenue.length === 0 ? (
            <p className="py-8 text-center text-muted">Aucune commande livrée sur la période.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface text-left text-muted">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Commandes</th>
                    <th className="p-3">GMV</th>
                    <th className="p-3">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.map((r) => (
                    <tr key={r.day} className="border-t border-border">
                      <td className="p-3">
                        {new Date(r.day).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="p-3">{r.orders_count}</td>
                      <td className="p-3">{formatFcfa(r.gmv)}</td>
                      <td className="p-3 text-gold">{formatFcfa(r.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="mb-3 mt-8 text-lg font-semibold">Revenu par boutique</h2>
          {shopRevenue.length === 0 ? (
            <p className="py-8 text-center text-muted">Aucune donnée sur la période.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface text-left text-muted">
                  <tr>
                    <th className="p-3">Boutique</th>
                    <th className="p-3">Commandes</th>
                    <th className="p-3">GMV</th>
                    <th className="p-3">Commission</th>
                    <th className="p-3">Reversé au vendeur</th>
                  </tr>
                </thead>
                <tbody>
                  {shopRevenue.map((s) => (
                    <tr key={s.shop_id} className="border-t border-border">
                      <td className="p-3">{s.shop_name}</td>
                      <td className="p-3">{s.orders_count}</td>
                      <td className="p-3">{formatFcfa(s.gmv)}</td>
                      <td className="p-3 text-gold">{formatFcfa(s.commission)}</td>
                      <td className="p-3">{formatFcfa(s.payout)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="mb-3 mt-8 text-lg font-semibold">
            Portefeuilles vendeurs — passif total : {formatFcfa(totalWalletLiability)}
          </h2>
          {wallets.length === 0 ? (
            <p className="py-8 text-center text-muted">Aucun portefeuille.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface text-left text-muted">
                  <tr>
                    <th className="p-3">Vendeur</th>
                    <th className="p-3">Boutique</th>
                    <th className="p-3">Solde</th>
                    <th className="p-3">Total crédité</th>
                    <th className="p-3">Total retiré</th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((w) => (
                    <tr key={w.user_id} className="border-t border-border">
                      <td className="p-3">{w.username}</td>
                      <td className="p-3 text-muted">{w.shop_name ?? "—"}</td>
                      <td className="p-3 font-semibold text-gold">
                        {formatFcfa(w.balance)}
                      </td>
                      <td className="p-3">{formatFcfa(w.lifetime_credit)}</td>
                      <td className="p-3">{formatFcfa(w.lifetime_withdrawn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gold">{value}</p>
    </div>
  );
}
