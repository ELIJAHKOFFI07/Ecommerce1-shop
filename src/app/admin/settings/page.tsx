"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PlatformSettings } from "@/lib/types";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [commission, setCommission] = useState("5");
  const [minWithdrawal, setMinWithdrawal] = useState("5000");
  const [supportPhone, setSupportPhone] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await createClient()
        .from("platform_settings")
        .select("*")
        .maybeSingle();
      const s = data as PlatformSettings | null;
      if (s) {
        setSettings(s);
        setCommission(String(s.commission_percent));
        setMinWithdrawal(String(s.min_withdrawal));
        setSupportPhone(s.support_phone ?? "");
        setSupportEmail(s.support_email ?? "");
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    const { error: rpcError } = await createClient().rpc("admin_update_settings", {
      p_commission_percent: Number(commission),
      p_min_withdrawal: Number(minWithdrawal),
      p_support_phone: supportPhone || null,
      p_support_email: supportEmail || null,
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) return <p className="py-16 text-center text-muted">Chargement…</p>;

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 text-2xl font-bold">Réglages de la plateforme</h1>
      <p className="mb-6 text-sm text-muted">
        Ces paramètres s&apos;appliquent immédiatement à toutes les nouvelles
        transactions (RPC admin_update_settings).
      </p>

      <div className="space-y-4 rounded-2xl border border-border bg-surface p-6">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Commission plateforme (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
          <p className="mt-1 text-xs text-muted">
            Prélevée sur chaque vente livrée avant crédit du portefeuille vendeur.
            {settings && ` Actuellement : ${settings.commission_percent} %.`}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Retrait minimum (FCFA)
          </label>
          <input
            type="number"
            min={0}
            value={minWithdrawal}
            onChange={(e) => setMinWithdrawal(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Téléphone support
          </label>
          <input
            value={supportPhone}
            onChange={(e) => setSupportPhone(e.target.value)}
            placeholder="+225 07 00 00 00 00"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Email support</label>
          <input
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            placeholder="support@elijahshop.app"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {saved && <p className="text-sm text-green-400">Enregistré !</p>}

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-lg bg-gold py-2.5 text-sm font-semibold text-black disabled:opacity-40"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
