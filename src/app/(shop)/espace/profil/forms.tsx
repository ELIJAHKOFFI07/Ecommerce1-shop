"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

export function ProfileForm({ initial }: { initial: { name: string; pseudo: string; phone: string; city: string } }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/me", { method: "PATCH", json: { name: f.name, pseudo: f.pseudo || undefined, phone: f.phone || undefined, city: f.city || undefined } });
      setMsg({ tone: "success", text: "Informations enregistrées." });
      router.refresh();
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Erreur." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nom complet" htmlFor="name">
          <Input id="name" value={f.name} onChange={set("name")} required maxLength={120} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Téléphone" htmlFor="phone">
            <Input id="phone" type="tel" inputMode="tel" value={f.phone} onChange={set("phone")} />
          </Field>
          <Field label="Ville" htmlFor="city">
            <Input id="city" value={f.city} onChange={set("city")} maxLength={120} />
          </Field>
        </div>
        <Field label="Pseudo (facultatif)" htmlFor="pseudo" hint="3 à 30 caractères, lettres, chiffres, . _ -">
          <Input id="pseudo" value={f.pseudo} onChange={set("pseudo")} maxLength={30} />
        </Field>
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Button type="submit" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const [f, setF] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.newPassword !== f.confirm) return setMsg({ tone: "error", text: "Les deux nouveaux mots de passe ne correspondent pas." });
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/me/password", { method: "POST", json: { currentPassword: f.currentPassword, newPassword: f.newPassword } });
      setMsg({ tone: "success", text: "Mot de passe modifié." });
      setF({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Erreur." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Mot de passe actuel" htmlFor="cur">
          <Input id="cur" type="password" autoComplete="current-password" value={f.currentPassword} onChange={set("currentPassword")} required />
        </Field>
        <Field label="Nouveau mot de passe" htmlFor="new" hint="10 caractères minimum, lettres et chiffres.">
          <Input id="new" type="password" autoComplete="new-password" value={f.newPassword} onChange={set("newPassword")} required minLength={10} />
        </Field>
        <Field label="Confirmer" htmlFor="conf">
          <Input id="conf" type="password" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} required />
        </Field>
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Button type="submit" variant="secondary" disabled={busy}>
          {busy ? "Modification…" : "Changer le mot de passe"}
        </Button>
      </form>
    </Card>
  );
}
