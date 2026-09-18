"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert, Button, Card, Empty, Field, Input, Textarea } from "@/components/ui";
import { ActionButton } from "@/components/admin";

type A = { id: string; label: string; fullName: string; phone: string; city: string; commune: string | null; details: string; isDefault: boolean };
const EMPTY = { label: "Domicile", fullName: "", phone: "", city: "", commune: "", details: "" };

export function AddressBook({ addresses }: { addresses: A[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  function start(a?: A) {
    setEditing(a ? a.id : "new");
    setF(a ? { label: a.label, fullName: a.fullName, phone: a.phone, city: a.city, commune: a.commune ?? "", details: a.details } : EMPTY);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = { ...f, commune: f.commune || null };
      if (editing === "new") await api("/api/me/addresses", { method: "POST", json: body });
      else await api(`/api/me/addresses/${editing}`, { method: "PATCH", json: body });
      setEditing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {editing ? (
        <Card className="p-5">
          <form onSubmit={submit} className="space-y-4">
            <Field label="Nom de l’adresse" htmlFor="lb" hint="Ex. : Domicile, Bureau"><Input id="lb" value={f.label} onChange={set("label")} required maxLength={120} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom complet" htmlFor="fn"><Input id="fn" value={f.fullName} onChange={set("fullName")} required maxLength={120} /></Field>
              <Field label="Téléphone" htmlFor="ph"><Input id="ph" type="tel" inputMode="tel" value={f.phone} onChange={set("phone")} required /></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ville" htmlFor="ci"><Input id="ci" value={f.city} onChange={set("city")} required maxLength={120} /></Field>
              <Field label="Commune / quartier" htmlFor="co"><Input id="co" value={f.commune} onChange={set("commune")} maxLength={120} /></Field>
            </div>
            <Field label="Adresse précise" htmlFor="de"><Textarea id="de" value={f.details} onChange={set("details")} required minLength={3} maxLength={300} className="min-h-20" /></Field>
            {error && <Alert tone="error">{error}</Alert>}
            <div className="flex gap-2"><Button type="submit" disabled={busy} loading={busy}>Enregistrer</Button><Button variant="ghost" onClick={() => setEditing(null)}>Annuler</Button></div>
          </form>
        </Card>
      ) : (
        <Button onClick={() => start()}>+ Ajouter une adresse</Button>
      )}
      {addresses.length === 0 && !editing ? (
        <Empty title="Aucune adresse enregistrée" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{a.label}</p>
                {a.isDefault && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">Par défaut</span>}
              </div>
              <p className="mt-1 font-semibold">{a.fullName} · {a.phone}</p>
              <p className="text-sm text-muted-foreground">{a.details}, {a.commune ? `${a.commune}, ` : ""}{a.city}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => start(a)}>Modifier</Button>
                {!a.isDefault && <ActionButton path={`/api/me/addresses/${a.id}`} method="PATCH" body={{ isDefault: true }} size="sm" variant="ghost">Par défaut</ActionButton>}
                <ActionButton path={`/api/me/addresses/${a.id}`} method="DELETE" size="sm" variant="ghost" confirm="Supprimer cette adresse ?">Supprimer</ActionButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
