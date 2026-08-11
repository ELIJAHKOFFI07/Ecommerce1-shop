"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/backend/client";
import type { PlatformSettings } from "@/lib/types";
import { HeaderSkeleton, Skeleton } from "@/components/Skeleton";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [commission, setCommission] = useState("5");
  const [minWithdrawal, setMinWithdrawal] = useState("5000");
  const [supportPhone, setSupportPhone] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(false);
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
        setAnnouncement(s.announcement ?? "");
        setAnnouncementActive(s.announcement_active);
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
      p_announcement: announcement || null,
      p_announcement_active: announcementActive,
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading)
    return (
      <div className="max-w-lg space-y-4">
        <HeaderSkeleton />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );

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
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
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
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
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
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Email support</label>
          <input
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            placeholder="support@dreamteamshop.app"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        <div className="rounded-lg border border-border p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={announcementActive}
              onChange={(e) => setAnnouncementActive(e.target.checked)}
              className="h-4 w-4"
            />
            Afficher un message a la une
          </label>
          <p className="mt-1 text-xs text-muted">
            Visible en haut de l&apos;application par les clients et les
            vendeurs. Chacun peut le masquer une fois lu.
          </p>
          <textarea
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            rows={3}
            placeholder="Ex : Livraison offerte tout le week-end !"
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {saved && <p className="text-sm text-green-400">Enregistré !</p>}

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-on-accent disabled:opacity-40"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
