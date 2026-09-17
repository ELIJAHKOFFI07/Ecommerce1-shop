"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatFcfa } from "@/lib/money";
import { Alert, Button, Field, Input, Card } from "@/components/ui";

type Found = { memberNumber: string; name: string; image: string | null };

/// Transfert en trois temps sur le même écran : trouver le destinataire,
/// confirmer son nom, saisir le montant. Le nom est affiché AVANT l'envoi
/// pour éviter l'erreur de numéro.
export function TransferDialog({ balance }: { balance: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Found | null | undefined>(undefined);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setFound(await api<Found | null>("/api/wallet/search", { method: "POST", json: { query } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!found) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/wallet/transfer", { method: "POST", json: { recipientMemberNumber: found.memberNumber, amount: Number(amount) } });
      setDone(`${formatFcfa(Number(amount))} envoyés à ${found.name}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setOpen(false);
    setQuery("");
    setFound(undefined);
    setAmount("");
    setError(null);
    setDone(null);
  }

  if (!open) {
    return (
      <Button variant="secondary" size="lg" onClick={() => setOpen(true)} disabled={balance <= 0}>
        Envoyer à un membre
      </Button>
    );
  }

  return (
    <Card className="border-border-strong p-5">
      {done ? (
        <div className="space-y-4">
          <Alert tone="success">{done}</Alert>
          <Button onClick={reset}>Fermer</Button>
        </div>
      ) : !found ? (
        <form onSubmit={search} className="space-y-4">
          <Field label="Numéro de membre, e-mail ou téléphone du destinataire" htmlFor="q">
            <Input id="q" value={query} onChange={(e) => setQuery(e.target.value)} required minLength={3} autoFocus placeholder="SL-123456" />
          </Field>
          {found === null && <Alert tone="error">Aucun membre trouvé. Vérifiez le numéro.</Alert>}
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex gap-3">
            <Button type="submit" disabled={busy} loading={busy}>
              {busy ? "Recherche…" : "Rechercher"}
            </Button>
            <Button variant="ghost" onClick={reset}>
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={send} className="space-y-4">
          <div className="flex items-center gap-3 rounded-md bg-muted p-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">{found.name[0]}</div>
            <div>
              <p className="font-semibold">{found.name}</p>
              <p className="text-sm text-muted-foreground">{found.memberNumber}</p>
            </div>
            <button type="button" onClick={() => setFound(undefined)} className="ml-auto cursor-pointer text-sm font-semibold underline underline-offset-4">
              Changer
            </button>
          </div>
          <Field label="Montant (F)" htmlFor="amount" hint={`Solde disponible : ${formatFcfa(balance)}`}>
            <Input id="amount" type="number" inputMode="numeric" min={1} max={balance} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus />
          </Field>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex gap-3">
            <Button type="submit" disabled={busy || !amount} loading={busy}>
              {busy ? "Envoi…" : `Envoyer ${amount ? formatFcfa(Number(amount)) : ""}`}
            </Button>
            <Button variant="ghost" onClick={reset}>
              Annuler
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
