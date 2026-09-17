"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert, Button, Card, Field, Input, Textarea } from "@/components/ui";
import { ActionButton } from "@/components/admin";

/// Actions sur une commande. Une seule action principale par état :
/// « Valider » en attente, « Marquer livrée » une fois validée. Le rejet
/// exige un motif — le membre le lira.
export function OrderActions({ id, status, shortage, refs }: { id: string; status: string; shortage: string[]; refs: { claimReference: string; salesNo: string } }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "reject" | "edit">("idle");
  const [edit, setEdit] = useState(refs);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(next: string, rejectionReason?: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/orders/${id}/status`, { method: "PATCH", json: { status: next, rejectionReason } });
      setMode("idle");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  async function saveRefs(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/orders/${id}`, { method: "PATCH", json: { claimReference: edit.claimReference.trim(), salesNo: edit.salesNo.trim() || null } });
      setMode("idle");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  const deletable = ["PENDING", "REJECTED", "CANCELLED"].includes(status);
  if (!["PENDING", "VALIDATED"].includes(status)) {
    return deletable ? (
      <Card className="space-y-3 p-5">
        <h2 className="font-semibold">Gestion</h2>
        <ActionButton path={`/api/admin/orders/${id}`} method="DELETE" variant="ghost" confirm="Supprimer définitivement cette commande ?" redirect="/admin/commandes" className="w-full">
          Supprimer la commande
        </ActionButton>
      </Card>
    ) : null;
  }

  return (
    <Card className="space-y-4 p-5">
      <h2 className="font-semibold">Action</h2>
      {status === "PENDING" && shortage.length > 0 && (
        <Alert tone="error">
          Stock virtuel insuffisant pour : {shortage.join(", ")}. Enregistrez une commande fournisseur avant de valider.
        </Alert>
      )}
      {mode === "reject" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go("REJECTED", reason);
          }}
          className="space-y-3"
        >
          <Field label="Motif du rejet (visible par le membre)" htmlFor="reason">
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} maxLength={2000} autoFocus />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" variant="destructive" disabled={busy} loading={busy}>
              Confirmer le rejet
            </Button>
            <Button variant="ghost" onClick={() => setMode("idle")}>
              Annuler
            </Button>
          </div>
        </form>
      ) : mode === "edit" ? (
        <form onSubmit={saveRefs} className="space-y-3">
          <Field label="Claim Reference" htmlFor="cr">
            <Input id="cr" value={edit.claimReference} onChange={(e) => setEdit({ ...edit, claimReference: e.target.value })} required minLength={3} maxLength={60} />
          </Field>
          <Field label="Sales No" htmlFor="sn">
            <Input id="sn" value={edit.salesNo} onChange={(e) => setEdit({ ...edit, salesNo: e.target.value })} maxLength={60} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy} loading={busy}>Enregistrer</Button>
            <Button variant="ghost" onClick={() => setMode("idle")}>Annuler</Button>
          </div>
        </form>
      ) : status === "PENDING" ? (
        <div className="space-y-2">
          <Button full size="lg" onClick={() => go("VALIDATED")} disabled={busy || shortage.length > 0}>
            Valider le reçu
          </Button>
          <p className="text-sm text-muted-foreground">Les produits entrent dans le stock du membre.</p>
          <Button full variant="secondary" onClick={() => setMode("reject")} disabled={busy}>
            Rejeter
          </Button>
          <Button full variant="ghost" onClick={() => setMode("edit")} disabled={busy}>
            Corriger les références
          </Button>
          <ActionButton path={`/api/admin/orders/${id}`} method="DELETE" variant="ghost" confirm="Supprimer définitivement cette commande ?" redirect="/admin/commandes" className="w-full">
            Supprimer
          </ActionButton>
        </div>
      ) : (
        <div className="space-y-2">
          <Button full onClick={() => go("DELIVERED")} disabled={busy}>
            Marquer livrée
          </Button>
          <Button full variant="secondary" onClick={() => window.confirm("Annuler cette commande validée ? Les produits sortiront du stock du membre.") && go("CANCELLED")} disabled={busy}>
            Annuler la commande
          </Button>
          <Button full variant="ghost" onClick={() => window.confirm("Rembourser ? Les produits sortiront du stock du membre.") && go("REFUNDED")} disabled={busy}>
            Rembourser
          </Button>
        </div>
      )}
      {error && <Alert tone="error">{error}</Alert>}
    </Card>
  );
}
