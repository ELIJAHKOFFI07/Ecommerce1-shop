"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export function StatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <select
      value={status}
      disabled={busy}
      aria-label="Statut"
      onChange={async (e) => {
        setBusy(true);
        try {
          await api(`/api/admin/formations/${id}`, { method: "PATCH", json: { status: e.target.value } });
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="h-10 rounded-md border border-border-strong bg-card px-2 text-sm"
    >
      <option value="UPCOMING">À venir</option>
      <option value="IN_PROGRESS">En cours</option>
      <option value="PAST">Passée</option>
      <option value="CANCELLED">Annulée</option>
    </select>
  );
}
