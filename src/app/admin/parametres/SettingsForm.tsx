"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

type S = { siteName: string; siteEmail: string; sitePhone: string; siteAddress: string; shippingFee: number; freeShippingThreshold: string; mobileMoneyNumber: string; mobileMoneyName: string };

export function SettingsForm({ initial, canEdit }: { initial: S; canEdit: boolean }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const set = (k: keyof S) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/admin/settings", { method: "PATCH", json: { ...f, siteAddress: f.siteAddress || null, shippingFee: Number(f.shippingFee), freeShippingThreshold: f.freeShippingThreshold === "" ? null : Number(f.freeShippingThreshold) } });
      setMsg({ tone: "success", text: "Paramètres enregistrés." });
      router.refresh();
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Erreur." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card className="space-y-5 p-5">
        <h2 className="font-semibold">Boutique</h2>
        <Field label="Nom affiché" htmlFor="n"><Input id="n" value={f.siteName} onChange={set("siteName")} required maxLength={120} disabled={!canEdit} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-mail de contact" htmlFor="e"><Input id="e" type="email" value={f.siteEmail} onChange={set("siteEmail")} disabled={!canEdit} /></Field>
          <Field label="Téléphone de contact" htmlFor="p"><Input id="p" type="tel" value={f.sitePhone} onChange={set("sitePhone")} disabled={!canEdit} /></Field>
        </div>
        <Field label="Adresse" htmlFor="a"><Input id="a" value={f.siteAddress} onChange={set("siteAddress")} maxLength={300} disabled={!canEdit} /></Field>
      </Card>
      <Card className="space-y-5 p-5">
        <h2 className="font-semibold">Livraison</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Frais de livraison (F)" htmlFor="sf"><Input id="sf" type="number" inputMode="numeric" min={0} step={1} value={f.shippingFee} onChange={set("shippingFee")} required disabled={!canEdit} /></Field>
          <Field label="Livraison offerte à partir de (F)" htmlFor="ft" hint="Laissez vide pour ne jamais l’offrir."><Input id="ft" type="number" inputMode="numeric" min={0} step={1} value={f.freeShippingThreshold} onChange={set("freeShippingThreshold")} disabled={!canEdit} /></Field>
        </div>
      </Card>
      <Card className="space-y-5 p-5">
        <h2 className="font-semibold">Mobile Money</h2>
        <p className="text-sm text-muted-foreground">Affiché au client qui choisit ce moyen de paiement. Laissez vide pour désactiver.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Numéro" htmlFor="mm"><Input id="mm" type="tel" value={f.mobileMoneyNumber} onChange={set("mobileMoneyNumber")} placeholder="+225 07 00 00 00 00" disabled={!canEdit} /></Field>
          <Field label="Nom du titulaire" htmlFor="mn"><Input id="mn" value={f.mobileMoneyName} onChange={set("mobileMoneyName")} maxLength={120} disabled={!canEdit} /></Field>
        </div>
      </Card>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      {canEdit && <Button type="submit" size="lg" disabled={busy} loading={busy}>Enregistrer</Button>}
    </form>
  );
}
