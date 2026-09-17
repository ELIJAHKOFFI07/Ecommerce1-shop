"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import { ActionButton } from "@/components/admin";

type U = { id: string; name: string; phone: string; city: string; role: string; status: string; blocked: boolean; officeId: string };
type Perm = { slug: string; canView: boolean; canEdit: boolean };

export function MemberEditor({ user, offices, isSelf, isSuperAdmin, modules, permissions, canDelete }: { user: U; offices: { id: string; name: string }[]; isSelf: boolean; isSuperAdmin: boolean; modules: { slug: string; name: string }[]; permissions: Perm[]; canDelete: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({ name: user.name, phone: user.phone, city: user.city, role: user.role, status: user.status, officeId: user.officeId });
  const [perms, setPerms] = useState<Record<string, Perm>>(Object.fromEntries(modules.map((m) => [m.slug, permissions.find((p) => p.slug === m.slug) ?? { slug: m.slug, canView: false, canEdit: false }])));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const isStaff = f.role !== "CLIENT" && f.role !== "SUPER_ADMIN";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/admin/users/${user.id}`, { method: "PATCH", json: { name: f.name, phone: f.phone || null, city: f.city || null, status: f.status, officeId: f.officeId || null, ...(isSuperAdmin && !isSelf ? { role: f.role } : {}) } });
      if (isSuperAdmin && isStaff) {
        await api(`/api/admin/users/${user.id}/permissions`, { method: "PUT", json: { permissions: Object.values(perms) } });
      }
      setMsg({ tone: "success", text: "Enregistré." });
      router.refresh();
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Erreur." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Modifier le compte{isSuperAdmin ? ", le rôle et les accès" : ""}</h2>
        <form onSubmit={save} className="space-y-4">
          <Field label="Nom" htmlFor="n">
            <Input id="n" value={f.name} onChange={set("name")} required maxLength={120} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Téléphone" htmlFor="p">
              <Input id="p" type="tel" value={f.phone} onChange={set("phone")} />
            </Field>
            <Field label="Ville" htmlFor="c">
              <Input id="c" value={f.city} onChange={set("city")} maxLength={120} />
            </Field>
          </div>
          <Field label="Statut" htmlFor="s">
            <Select id="s" value={f.status} onChange={set("status")}>
              <option value="MEMBRE">Membre</option>
              <option value="INDEPENDANT">Indépendant</option>
              <option value="CHEF_EQUIPE">Chef d’équipe</option>
            </Select>
          </Field>
          <Field label="Bureau" htmlFor="o">
            <Select id="o" value={f.officeId} onChange={set("officeId")}>
              <option value="">Aucun</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
          {isSuperAdmin && (
            <Field label="Rôle" htmlFor="r" hint={isSelf ? "Vous ne pouvez pas changer votre propre rôle." : undefined}>
              <Select id="r" value={f.role} onChange={set("role")} disabled={isSelf}>
                <option value="CLIENT">Membre</option>
                <option value="SUPPORT">Support</option>
                <option value="STOCK_MANAGER">Gestion du stock</option>
                <option value="ADMIN">Administrateur</option>
                <option value="SUPER_ADMIN">Super administrateur</option>
              </Select>
            </Field>
          )}
          {isSuperAdmin && isStaff && (
            <fieldset className="space-y-2 rounded-md bg-muted p-4">
              <legend className="px-1 text-sm font-semibold">Accès par module</legend>
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-1 text-sm">
                <span />
                <span className="text-xs font-semibold text-muted-foreground">Voir</span>
                <span className="text-xs font-semibold text-muted-foreground">Modifier</span>
                {modules.map((m) => (
                  <ModuleRow key={m.slug} name={m.name} p={perms[m.slug]!} onChange={(p) => setPerms({ ...perms, [m.slug]: p })} />
                ))}
              </div>
            </fieldset>
          )}
          {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
          <Button type="submit" full disabled={busy} loading={busy}>
            {busy ? "…" : "Enregistrer"}
          </Button>
        </form>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-semibold">Sécurité</h2>
        <ActionButton path={`/api/admin/users/${user.id}/reset-password`} variant="secondary" confirm="Envoyer un nouveau mot de passe temporaire par e-mail ?" className="w-full">
          Réinitialiser le mot de passe
        </ActionButton>
        {!isSelf && (
          <ActionButton path={`/api/admin/users/${user.id}`} method="PATCH" body={{ blocked: !user.blocked }} variant={user.blocked ? "secondary" : "destructive"} confirm={user.blocked ? "Débloquer ce compte ?" : "Bloquer ce compte ? La personne ne pourra plus se connecter."} className="w-full">
            {user.blocked ? "Débloquer le compte" : "Bloquer le compte"}
          </ActionButton>
        )}
        {!isSelf && (
          <>
            <ActionButton path={`/api/admin/users/${user.id}`} method="DELETE" variant="ghost" confirm={`Supprimer définitivement le compte de ${user.name} ?`} redirect="/admin/membres" disabled={!canDelete} className="w-full">
              Supprimer le compte
            </ActionButton>
            {!canDelete && <p className="text-xs text-muted-foreground">Ce compte a un historique (commandes, retraits, solde ou filleuls) : il se bloque, il ne se supprime pas.</p>}
          </>
        )}
      </Card>
    </div>
  );
}

function ModuleRow({ name, p, onChange }: { name: string; p: Perm; onChange: (p: Perm) => void }) {
  return (
    <>
      <span className="py-1">{name}</span>
      <input type="checkbox" aria-label={`Voir ${name}`} checked={p.canView || p.canEdit} onChange={(e) => onChange({ ...p, canView: e.target.checked, canEdit: e.target.checked ? p.canEdit : false })} className="h-5 w-5 justify-self-center accent-primary" />
      <input type="checkbox" aria-label={`Modifier ${name}`} checked={p.canEdit} onChange={(e) => onChange({ ...p, canEdit: e.target.checked, canView: e.target.checked ? true : p.canView })} className="h-5 w-5 justify-self-center accent-primary" />
    </>
  );
}
