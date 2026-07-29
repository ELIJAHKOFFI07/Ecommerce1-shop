"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/backend/client";
import { ROLE_LABELS, type UserRole } from "@/lib/roles";

/// Sélecteur de rôle (client / vendeur / administrateur).
///
/// Passe obligatoirement par la RPC `admin_set_user_role` : les colonnes
/// is_admin et is_seller sont retirées au rôle `authenticated`
/// (`grant update (...) to service_role` dans schema.sql), donc un
/// `.update()` direct depuis le navigateur est refusé par la base.
export function AdminUserRow({
  id,
  role,
}: {
  id: string;
  role: UserRole;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: UserRole) {
    if (next === role) return;
    setBusy(true);
    setError(null);
    const { error: rpcError } = await createClient().rpc(
      "admin_set_user_role",
      { p_user_id: id, p_role: next },
    );
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <select
        value={role}
        disabled={busy}
        onChange={(e) => change(e.target.value as UserRole)}
        className="rounded-md border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-gold disabled:opacity-50"
      >
        {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 max-w-40 text-xs text-red-400">{error}</p>}
    </div>
  );
}
