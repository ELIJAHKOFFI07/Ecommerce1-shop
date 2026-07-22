"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AdminUserRow({
  id,
  isAdmin,
}: {
  id: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleAdmin() {
    setBusy(true);
    // Nécessite un compte admin (RLS profiles_update_self autorise is_admin
    // via public.is_admin()). Sinon l'update est refusé côté base.
    await createClient()
      .from("profiles")
      .update({ is_admin: !isAdmin })
      .eq("id", id);
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      disabled={busy}
      onClick={toggleAdmin}
      className="rounded-md border border-border px-2 py-1 text-xs hover:border-gold hover:text-gold"
    >
      {isAdmin ? "Retirer admin" : "Promouvoir admin"}
    </button>
  );
}
