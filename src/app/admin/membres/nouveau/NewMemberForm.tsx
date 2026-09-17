"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";

export function NewMemberForm({ offices, isSuperAdmin }: { offices: { id: string; name: string }[]; isSuperAdmin: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", phone: "", role: "CLIENT", status: "MEMBRE", officeId: "", sponsorMemberNumber: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await api<{ id: string }>("/api/admin/users", { method: "POST", json: { ...f, phone: f.phone || undefined, officeId: f.officeId || null, sponsorMemberNumber: f.sponsorMemberNumber || undefined } });
      router.push(`/admin/membres/${u.id}?cree=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
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
          <Field label="E-mail" htmlFor="email">
            <Input id="email" type="email" value={f.email} onChange={set("email")} required />
          </Field>
          <Field label="Téléphone" htmlFor="phone">
            <Input id="phone" type="tel" inputMode="tel" value={f.phone} onChange={set("phone")} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rôle" htmlFor="role">
            <Select id="role" value={f.role} onChange={set("role")} disabled={!isSuperAdmin}>
              <option value="CLIENT">Membre</option>
              {isSuperAdmin && (
                <>
                  <option value="SUPPORT">Support</option>
                  <option value="STOCK_MANAGER">Gestion du stock</option>
                  <option value="ADMIN">Administrateur</option>
                  <option value="SUPER_ADMIN">Super administrateur</option>
                </>
              )}
            </Select>
          </Field>
          <Field label="Statut" htmlFor="status">
            <Select id="status" value={f.status} onChange={set("status")}>
              <option value="MEMBRE">Membre</option>
              <option value="INDEPENDANT">Indépendant</option>
              <option value="CHEF_EQUIPE">Chef d’équipe</option>
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bureau" htmlFor="office">
            <Select id="office" value={f.officeId} onChange={set("officeId")}>
              <option value="">Aucun</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Numéro du parrain" htmlFor="sponsor">
            <Input id="sponsor" value={f.sponsorMemberNumber} onChange={set("sponsorMemberNumber")} placeholder="SL-123456" maxLength={30} />
          </Field>
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "Création…" : "Créer le compte"}
        </Button>
      </form>
    </Card>
  );
}
