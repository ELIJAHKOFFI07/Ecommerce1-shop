"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

type S = { siteName: string; siteEmail: string; sitePhone: string; taxRate: number; allowReceiptSending: boolean };

export function SettingsForm({ initial, canEdit }: { initial: S; canEdit: boolean }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/admin/settings", { method: "PATCH", json: { ...f, siteEmail: f.siteEmail || null, sitePhone: f.sitePhone || null } });
      setMsg({ tone: "success", text: "Paramètres enregistrés." });
      router.refresh();
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Erreur." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-5">
        <Field label="Nom affiché" htmlFor="n">
          <Input id="n" value={f.siteName} onChange={(e) => setF({ ...f, siteName: e.target.value })} required maxLength={120} disabled={!canEdit} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-mail de contact" htmlFor="e">
            <Input id="e" type="email" value={f.siteEmail} onChange={(e) => setF({ ...f, siteEmail: e.target.value })} disabled={!canEdit} />
          </Field>
          <Field label="Téléphone de contact" htmlFor="p">
            <Input id="p" type="tel" value={f.sitePhone} onChange={(e) => setF({ ...f, sitePhone: e.target.value })} disabled={!canEdit} />
          </Field>
        </div>
        <Field label="Taux de TVA par défaut (%)" htmlFor="t" hint="Appliqué aux nouveaux produits.">
          <Input id="t" type="number" inputMode="decimal" min={0} max={100} step={0.5} value={f.taxRate} onChange={(e) => setF({ ...f, taxRate: Number(e.target.value) })} disabled={!canEdit} />
        </Field>
        <label className="flex cursor-pointer items-start gap-3 rounded-md bg-muted p-4">
          <input type="checkbox" checked={f.allowReceiptSending} onChange={(e) => setF({ ...f, allowReceiptSending: e.target.checked })} disabled={!canEdit} className="mt-0.5 h-5 w-5 accent-primary" />
          <span>
            <span className="font-semibold">Autoriser l’envoi de reçus</span>
            <span className="block text-sm text-muted-foreground">Décochez pour suspendre temporairement les nouvelles commandes des membres.</span>
          </span>
        </label>
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        {canEdit && (
          <Button type="submit" disabled={busy}>
            {busy ? "…" : "Enregistrer"}
          </Button>
        )}
      </form>
    </Card>
  );
}
