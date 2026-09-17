"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatFcfa } from "@/lib/money";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { ActionButton } from "@/components/admin";

/// Le parcours admin d'un retrait, dans l'ordre : approuver → fixer la TVA
/// → encaisser la TVA → remettre. Chaque étape n'affiche que l'action
/// suivante.
export function DeliveryActions({ id, status, tva, tvaPaid, balance, problems }: { id: string; status: string; tva: number | null; tvaPaid: boolean; balance: number; problems: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "reject">("idle");
  const [reason, setReason] = useState("");
  const [tvaInput, setTvaInput] = useState(tva?.toString() ?? "");
  const [method, setMethod] = useState<"WALLET" | "CASH" | "MOBILE_MONEY" | "OTHER">(balance >= (tva ?? 0) && (tva ?? 0) > 0 ? "WALLET" : "CASH");

  async function call(path: string, json: unknown) {
    setBusy(true);
    setError(null);
    try {
      await api(path, { method: "PATCH", json });
      setMode("idle");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "DELIVERED") return null;
  if (status === "REJECTED") {
    return tvaPaid ? null : (
      <Card className="space-y-3 p-5">
        <h2 className="font-semibold">Gestion</h2>
        <ActionButton path={`/api/admin/deliveries/${id}`} method="DELETE" variant="ghost" confirm="Supprimer définitivement ce retrait ?" redirect="/admin/retraits" className="w-full">
          Supprimer le retrait
        </ActionButton>
      </Card>
    );
  }

  return (
    <Card className="space-y-5 p-5">
      <h2 className="font-semibold">Action</h2>
      {problems.length > 0 && (
        <Alert tone="error">
          <ul className="list-disc pl-4">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Alert>
      )}

      {mode === "reject" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            call(`/api/admin/deliveries/${id}/status`, { status: "REJECTED", rejectionReason: reason });
          }}
          className="space-y-3"
        >
          <Field label="Motif du refus (visible par le membre)" htmlFor="reason">
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} autoFocus />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" variant="destructive" disabled={busy}>
              Confirmer le refus
            </Button>
            <Button variant="ghost" onClick={() => setMode("idle")}>
              Annuler
            </Button>
          </div>
        </form>
      ) : status === "PENDING" ? (
        <div className="space-y-2">
          <Button full size="lg" onClick={() => call(`/api/admin/deliveries/${id}/status`, { status: "APPROVED" })} disabled={busy}>
            Approuver
          </Button>
          <Button full variant="secondary" onClick={() => setMode("reject")} disabled={busy}>
            Refuser
          </Button>
          <ActionButton path={`/api/admin/deliveries/${id}`} method="DELETE" variant="ghost" confirm="Supprimer définitivement ce retrait ?" redirect="/admin/retraits" className="w-full">
            Supprimer
          </ActionButton>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Étape TVA */}
          <div className="space-y-3 rounded-md bg-muted p-4">
            <p className="text-sm font-semibold">1 · TVA</p>
            {tvaPaid ? (
              <p className="text-sm text-success">TVA de {formatFcfa(tva ?? 0)} payée.</p>
            ) : (
              <>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    call(`/api/admin/deliveries/${id}/tva`, { action: "set", tva: tvaInput === "" ? null : Number(tvaInput) });
                  }}
                  className="flex gap-2"
                >
                  <Input type="number" inputMode="numeric" min={0} step={1} value={tvaInput} onChange={(e) => setTvaInput(e.target.value)} placeholder="Montant en F" aria-label="Montant de la TVA" />
                  <Button type="submit" variant="secondary" disabled={busy}>
                    Fixer
                  </Button>
                </form>
                {tva !== null && tva > 0 && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      call(`/api/admin/deliveries/${id}/tva`, { action: "pay", paymentMethod: method });
                    }}
                    className="space-y-2"
                  >
                    <Select value={method} onChange={(e) => setMethod(e.target.value as never)} aria-label="Moyen de paiement">
                      <option value="WALLET" disabled={balance < tva}>
                        Depuis le solde ({formatFcfa(balance)} disponible)
                      </option>
                      <option value="CASH">Espèces</option>
                      <option value="MOBILE_MONEY">Mobile Money</option>
                      <option value="OTHER">Autre</option>
                    </Select>
                    <Button type="submit" full disabled={busy}>
                      Encaisser {formatFcfa(tva)}
                    </Button>
                  </form>
                )}
              </>
            )}
          </div>
          {/* Étape remise */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">2 · Remise</p>
            <Button full size="lg" onClick={() => call(`/api/admin/deliveries/${id}/status`, { status: "DELIVERED" })} disabled={busy || problems.length > 0 || (tva !== null && tva > 0 && !tvaPaid)}>
              Marquer comme remis
            </Button>
            <p className="text-sm text-muted-foreground">Sort les produits du stock bureau et du stock du membre.</p>
            <Button full variant="ghost" onClick={() => setMode("reject")} disabled={busy}>
              Refuser
            </Button>
          </div>
        </div>
      )}
      {error && <Alert tone="error">{error}</Alert>}
    </Card>
  );
}
