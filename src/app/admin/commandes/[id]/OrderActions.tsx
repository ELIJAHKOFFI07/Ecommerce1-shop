"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert, Button, Card, Field, Textarea } from "@/components/ui";

/// Actions sur une commande. Une seule action principale par état :
/// « Valider » en attente, « Marquer livrée » une fois validée. Le rejet
/// exige un motif — le membre le lira.
export function OrderActions({ id, status, shortage }: { id: string; status: string; shortage: string[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "reject">("idle");
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

  if (!["PENDING", "VALIDATED"].includes(status)) return null;

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
            <Button type="submit" variant="destructive" disabled={busy}>
              Confirmer le rejet
            </Button>
            <Button variant="ghost" onClick={() => setMode("idle")}>
              Annuler
            </Button>
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
