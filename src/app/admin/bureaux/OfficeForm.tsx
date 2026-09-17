"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { MemberPicker } from "@/components/MemberPicker";

export function OfficeForm() {
  const router = useRouter();
  const [managerId, setManagerId] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", city: "", commune: "", neighborhood: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!managerId) return setError("Choisissez un responsable.");
    setBusy(true);
    setError(null);
    try {
      const o = await api<{ id: string }>("/api/admin/offices", { method: "POST", json: { ...f, managerId, city: f.city || null, commune: f.commune || null, neighborhood: f.neighborhood || null } });
      router.push(`/admin/bureaux/${o.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
      setBusy(false);
    }
  }

  return (
    <Card className="h-fit p-5">
      <h2 className="mb-4 font-semibold">Nouveau bureau</h2>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nom du bureau" htmlFor="n">
          <Input id="n" value={f.name} onChange={set("name")} required maxLength={120} placeholder="Ex. : Bureau de Yopougon" />
        </Field>
        <MemberPicker label="Responsable" onPick={setManagerId} />
        <Field label="Ville" htmlFor="c">
          <Input id="c" value={f.city} onChange={set("city")} maxLength={120} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Commune" htmlFor="co">
            <Input id="co" value={f.commune} onChange={set("commune")} maxLength={120} />
          </Field>
          <Field label="Quartier" htmlFor="q">
            <Input id="q" value={f.neighborhood} onChange={set("neighborhood")} maxLength={120} />
          </Field>
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" full disabled={busy} loading={busy}>
          Créer le bureau
        </Button>
      </form>
    </Card>
  );
}
