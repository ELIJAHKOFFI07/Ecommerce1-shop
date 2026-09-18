"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert, Button, Card, Field, Textarea } from "@/components/ui";

export function CancelOrder({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open) return <Button variant="ghost" onClick={() => setOpen(true)}>Annuler cette commande</Button>;
  return (
    <Card className="p-5">
      <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(null); try { await api(`/api/orders/${id}`, { method: "PATCH", json: { cancelReason: reason } }); router.refresh(); setOpen(false); } catch (err) { setError(err instanceof Error ? err.message : "Erreur."); } finally { setBusy(false); } }} className="space-y-3">
        <Field label="Pourquoi annulez-vous ?" htmlFor="r"><Textarea id="r" value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} autoFocus className="min-h-20" /></Field>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex gap-2"><Button type="submit" variant="destructive" disabled={busy} loading={busy}>Confirmer l’annulation</Button><Button variant="ghost" onClick={() => setOpen(false)}>Retour</Button></div>
      </form>
    </Card>
  );
}
