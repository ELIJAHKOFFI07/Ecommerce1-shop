"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, uploadFile } from "@/lib/api";
import { formatFcfa } from "@/lib/money";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";

export function CreditForm({ userId, generalBalance }: { userId: string; generalBalance: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [description, setDescription] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm(`Créditer ${formatFcfa(Number(amount))} sur ce compte ?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const proofUrl = proof ? (await uploadFile(proof, "proof")).url : undefined;
      await api("/api/admin/wallet/credit", { method: "POST", json: { userId, amount: Number(amount), paymentMethod: method, description: description || undefined, proofUrl } });
      setMsg({ tone: "success", text: `${formatFcfa(Number(amount))} crédités.` });
      setAmount("");
      setDescription("");
      setProof(null);
      router.refresh();
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Erreur." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="h-fit p-5">
      <h2 className="font-semibold">Créditer le solde</h2>
      <p className="mt-1 text-sm text-muted-foreground">Solde général disponible : {formatFcfa(generalBalance)}</p>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <Field label="Montant (F)" htmlFor="amt">
          <Input id="amt" type="number" inputMode="numeric" min={1} max={generalBalance} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
        <Field label="Moyen de paiement reçu" htmlFor="m">
          <Select id="m" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="CASH">Espèces</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="OTHER">Autre</option>
          </Select>
        </Field>
        <Field label="Description (facultatif)" htmlFor="d">
          <Input id="d" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
        </Field>
        <Field label="Preuve de paiement (facultatif)" htmlFor="p" hint="Image ou PDF, 8 Mo max.">
          <input id="p" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setProof(e.target.files?.[0] ?? null)} className="block w-full text-sm file:mr-3 file:h-10 file:cursor-pointer file:rounded-md file:border file:border-border-strong file:bg-card file:px-3 file:font-semibold" />
        </Field>
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Button type="submit" full disabled={busy || !amount}>
          {busy ? "…" : "Créditer"}
        </Button>
      </form>
    </Card>
  );
}
