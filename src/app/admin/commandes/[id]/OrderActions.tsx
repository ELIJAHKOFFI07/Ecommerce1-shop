"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert, Button, Card, Field, Input, Textarea } from "@/components/ui";
import { ActionButton } from "@/components/admin";

/// Actions sur une commande. Une seule action principale par état :
/// Confirmer → Expédier → Livrer. L'annulation exige un motif — le client
/// le lira. Le paiement Mobile Money se marque reçu avec sa référence.
export function OrderActions({ id, status, paymentMethod, paymentStatus, shortage }: { id: string; status: string; paymentMethod: string; paymentStatus: string; shortage: string[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "cancel" | "pay">("idle");
  const [reason, setReason] = useState("");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setMode("idle");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }
  const go = (next: string, cancelReason?: string) => run(() => api(`/api/admin/orders/${id}/status`, { method: "PATCH", json: { status: next, cancelReason } }));

  const NEXT: Record<string, { status: string; label: string; hint: string } | undefined> = {
    PENDING: { status: "CONFIRMED", label: "Confirmer la commande", hint: "Le stock sera réservé et le client prévenu." },
    CONFIRMED: { status: "SHIPPED", label: "Marquer expédiée", hint: "Le client est prévenu que le colis est en route." },
    SHIPPED: { status: "DELIVERED", label: "Marquer livrée", hint: paymentMethod === "CASH_ON_DELIVERY" ? "Le paiement à la livraison sera considéré comme encaissé." : "La commande sera clôturée." },
  };
  const next = NEXT[status];
  const canCancel = ["PENDING", "CONFIRMED", "SHIPPED"].includes(status);

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Action</h2>
        {status === "PENDING" && shortage.length > 0 && <Alert tone="error">Stock insuffisant pour : {shortage.join(", ")}. Ajoutez du stock avant de confirmer.</Alert>}
        {mode === "cancel" ? (
          <form onSubmit={(e) => { e.preventDefault(); go("CANCELLED", reason); }} className="space-y-3">
            <Field label="Motif de l’annulation (visible par le client)" htmlFor="reason">
              <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} maxLength={2000} autoFocus />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" variant="destructive" disabled={busy} loading={busy}>Confirmer l’annulation</Button>
              <Button variant="ghost" onClick={() => setMode("idle")}>Retour</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-2">
            {next && (
              <>
                <Button full size="lg" onClick={() => go(next.status)} disabled={busy || (status === "PENDING" && shortage.length > 0)} loading={busy}>{next.label}</Button>
                <p className="text-sm text-muted-foreground">{next.hint}</p>
              </>
            )}
            {canCancel && <Button full variant="secondary" onClick={() => setMode("cancel")} disabled={busy}>Annuler la commande</Button>}
            {status === "CANCELLED" && (
              <ActionButton path={`/api/admin/orders/${id}`} method="DELETE" variant="ghost" confirm="Supprimer définitivement cette commande annulée ?" redirect="/admin/commandes" className="w-full">Supprimer la commande</ActionButton>
            )}
          </div>
        )}
        {error && <Alert tone="error">{error}</Alert>}
      </Card>

      {paymentMethod === "MOBILE_MONEY" && status !== "CANCELLED" && (
        <Card className="space-y-3 p-5">
          <h2 className="font-semibold">Paiement Mobile Money</h2>
          {paymentStatus === "PAID" ? (
            <>
              <Alert tone="success">Paiement reçu.</Alert>
              <ActionButton path={`/api/admin/orders/${id}`} method="PATCH" body={{ paymentStatus: "REFUNDED" }} variant="ghost" size="sm" confirm="Marquer ce paiement comme remboursé ?">Marquer remboursé</ActionButton>
            </>
          ) : paymentStatus === "REFUNDED" ? (
            <Alert tone="info">Paiement remboursé.</Alert>
          ) : mode === "pay" ? (
            <form onSubmit={(e) => { e.preventDefault(); run(() => api(`/api/admin/orders/${id}`, { method: "PATCH", json: { paymentStatus: "PAID", paymentRef: ref.trim() || null } })); }} className="space-y-3">
              <Field label="Référence du transfert (facultatif)" htmlFor="ref"><Input id="ref" value={ref} onChange={(e) => setRef(e.target.value)} maxLength={80} autoFocus /></Field>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy} loading={busy}>Paiement reçu</Button>
                <Button variant="ghost" onClick={() => setMode("idle")}>Retour</Button>
              </div>
            </form>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Vérifiez la réception du transfert, puis :</p>
              <Button full variant="accent" onClick={() => setMode("pay")} disabled={busy}>Marquer le paiement reçu</Button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
