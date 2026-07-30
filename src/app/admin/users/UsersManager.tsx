"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Pencil, Plus, Trash2, X } from "lucide-react";
import { ROLE_LABELS, roleOf, type UserRole } from "@/lib/roles";
import type { Profile } from "@/lib/types";

/// Gestion des comptes par un administrateur.
///
/// Toutes les opérations passent par /api/admin/users : créer, supprimer ou
/// changer un mot de passe touche auth.users, inaccessible depuis le
/// navigateur. Le serveur revérifie systématiquement que l'appelant est
/// administrateur (requireAdmin), l'interface ne fait pas autorité.
export function UsersManager({ users }: { users: Profile[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Profile | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<{
    username: string;
    password: string;
  } | null>(null);

  async function call(
    method: "POST" | "PATCH" | "DELETE",
    body: Record<string, unknown>,
    path = "/api/admin/users",
  ) {
    setError(null);
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Opération impossible.");
      return null;
    }
    return json;
  }

  async function changeRole(user: Profile, role: UserRole) {
    setBusyId(user.id);
    const ok = await call("PATCH", { userId: user.id, role });
    setBusyId(null);
    if (ok) router.refresh();
  }

  async function resetPassword(user: Profile) {
    if (
      !window.confirm(
        `Réinitialiser le mot de passe de « ${user.username} » ? Un mot de passe temporaire sera généré et l'utilisateur devra en choisir un nouveau à sa prochaine connexion.`,
      )
    ) {
      return;
    }
    setBusyId(user.id);
    const res = await call(
      "POST",
      { userId: user.id },
      "/api/admin/users/password",
    );
    setBusyId(null);
    if (res?.tempPassword) {
      setTempPassword({ username: user.username, password: res.tempPassword });
      router.refresh();
    }
  }

  async function remove(user: Profile) {
    if (
      !window.confirm(
        `Supprimer définitivement « ${user.username} » ? Son compte, sa boutique et ses données associées seront effacés. Cette action est irréversible.`,
      )
    ) {
      return;
    }
    setBusyId(user.id);
    const ok = await call("DELETE", { userId: user.id });
    setBusyId(null);
    if (ok) router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Utilisateurs ({users.length})</h1>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black"
        >
          <Plus className="h-4 w-4" /> Nouveau compte
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {tempPassword && (
        <div className="mb-4 rounded-lg border border-gold bg-gold/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                Mot de passe temporaire pour « {tempPassword.username} »
              </p>
              <p className="mt-2 break-all font-mono text-lg text-gold">
                {tempPassword.password}
              </p>
              <p className="mt-2 text-xs text-muted">
                Communiquez-le à l&apos;utilisateur : il ne sera plus affiché.
                Un changement lui sera imposé à la connexion.
              </p>
            </div>
            <button
              onClick={() => setTempPassword(null)}
              className="shrink-0 text-muted hover:text-foreground"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface text-left text-muted">
            <tr>
              <th className="p-3">Utilisateur</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Points</th>
              <th className="p-3">Rôle</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const role = roleOf(u) ?? "user";
              return (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3">
                    {u.full_name ?? u.username}
                    <span className="block text-xs text-muted">
                      @{u.username}
                    </span>
                    {u.must_change_password && (
                      <span className="mt-1 inline-block rounded bg-gold/15 px-1.5 py-0.5 text-[10px] text-gold">
                        doit changer son mot de passe
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-muted">
                    {u.phone ?? u.whatsapp ?? "—"}
                    <span className="block text-xs">{u.city ?? ""}</span>
                  </td>
                  <td className="p-3">{u.loyalty_points}</td>
                  <td className="p-3">
                    <select
                      value={role}
                      disabled={busyId === u.id}
                      onChange={(e) =>
                        changeRole(u, e.target.value as UserRole)
                      }
                      className="rounded-md border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-gold disabled:opacity-50"
                    >
                      {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setEditing(u)}
                        disabled={busyId === u.id}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-gold disabled:opacity-50"
                      >
                        <Pencil className="h-3 w-3" /> Modifier
                      </button>
                      <button
                        onClick={() => resetPassword(u)}
                        disabled={busyId === u.id}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-gold disabled:opacity-50"
                      >
                        <KeyRound className="h-3 w-3" /> Mot de passe
                      </button>
                      <button
                        onClick={() => remove(u)}
                        disabled={busyId === u.id}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-red-500 hover:text-red-400 disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <UserDialog
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {creating && (
        <CreateUserDialog
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

const FIELD =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-gold";

function UserDialog({
  user,
  onClose,
  onSaved,
}: {
  user: Profile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [username, setUsername] = useState(user.username);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(user.whatsapp ?? "");
  const [city, setCity] = useState(user.city ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        fullName,
        username,
        phone,
        whatsapp,
        city,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "Enregistrement impossible.");
      return;
    }
    onSaved();
  }

  return (
    <Modal title={`Modifier « ${user.username} »`} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nom complet"
          className={FIELD}
        />
        <input
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Pseudo"
          className={FIELD}
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Téléphone"
          className={FIELD}
        />
        <input
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="WhatsApp"
          className={FIELD}
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Ville"
          className={FIELD}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={saving}
          className="w-full rounded-full bg-gold py-2.5 font-semibold text-black disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </Modal>
  );
}

function CreateUserDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password, role }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "Création impossible.");
      return;
    }
    onCreated();
  }

  return (
    <Modal title="Nouveau compte" onClose={onClose}>
      <form onSubmit={create} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          className={FIELD}
        />
        <input
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Pseudo"
          className={FIELD}
        />
        <input
          type="text"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe (8 caractères min.)"
          className={FIELD}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className={FIELD}
        >
          {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted">
          Le compte est créé déjà confirmé : aucun e-mail de validation n&apos;est
          envoyé.
        </p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={saving}
          className="w-full rounded-full bg-gold py-2.5 font-semibold text-black disabled:opacity-50"
        >
          {saving ? "Création…" : "Créer le compte"}
        </button>
      </form>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-4 sm:items-center">
      <div className="my-auto w-full max-w-md rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
