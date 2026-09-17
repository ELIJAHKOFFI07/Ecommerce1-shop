"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatFcfa } from "@/lib/money";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";

export function GeneralForms({ taxBalance, generalBalance }: { taxBalance: number; generalBalance: number }) {
  const router = useRouter();
  const [type, setType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function adjust(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm(`${type === "CREDIT" ? "Ajouter" : "Retirer"} ${formatFcfa(Number(amount))} ${type === "CREDIT" ? "au" : "du"} solde général ?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/admin/wallet/general", { method: "POST", json: { type, amount: Number(amount), description } });
      setMsg({ tone: "success", text: "Solde général mis à jour." });
      setAmount("");
      setDescription("");
      router.refresh();
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Erreur." });
    } finally {
      setBusy(false);
    }
  }

  async function transferTax(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm(`Transférer ${formatFcfa(Number(taxAmount))} du solde taxe vers le solde général ?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/admin/wallet/general", { method: "PUT", json: { amount: Number(taxAmount) } });
      setMsg({ tone: "success", text: "Transfert effectué." });
      setTaxAmount("");
      router.refresh();
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Erreur." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Ajuster le solde général</h2>
        <form onSubmit={adjust} className="space-y-4">
          <Field label="Opération" htmlFor="t">
            <Select id="t" value={type} onChange={(e) => setType(e.target.value as never)}>
              <option value="CREDIT">Ajouter (apport de fonds)</option>
              <option value="DEBIT">Retirer (sortie de caisse)</option>
            </Select>
          </Field>
          <Field label="Montant (F)" htmlFor="a">
            <Input id="a" type="number" inputMode="numeric" min={1} max={type === "DEBIT" ? generalBalance : undefined} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </Field>
          <Field label="Description" htmlFor="d">
            <Input id="d" value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={2000} placeholder="Ex. : apport du 15/09" />
          </Field>
          <Button type="submit" full disabled={busy}>
            Enregistrer
          </Button>
        </form>
      </Card>
      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Taxe → général</h2>
        <form onSubmit={transferTax} className="space-y-4">
          <Field label="Montant (F)" htmlFor="ta" hint={`Solde taxe : ${formatFcfa(taxBalance)}`}>
            <Input id="ta" type="number" inputMode="numeric" min={1} max={taxBalance} step={1} value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} required />
          </Field>
          <Button type="submit" variant="secondary" full disabled={busy || taxBalance <= 0}>
            Transférer
          </Button>
        </form>
      </Card>
      {msg && (
        <div className="md:col-span-2">
          <Alert tone={msg.tone}>{msg.text}</Alert>
        </div>
      )}
    </div>
  );
}
