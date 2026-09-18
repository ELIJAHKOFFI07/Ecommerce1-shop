"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";

export function NewUserForm({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", phone: "", role: "CLIENT" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await api<{ id: string }>("/api/admin/users", { method: "POST", json: { ...f, phone: f.phone || undefined } });
      router.push(`/admin/utilisateurs/${u.id}?cree=1`);
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
              <option value="CLIENT">Client</option>
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
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" size="lg" disabled={busy} loading={busy}>
          {busy ? "Création…" : "Créer le compte"}
        </Button>
      </form>
    </Card>
  );
}
