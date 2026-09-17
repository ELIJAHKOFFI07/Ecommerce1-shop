"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import { MemberPicker } from "@/components/MemberPicker";

type P = { id: string; title: string; sku: string };

export function ConversionForm({ products }: { products: P[] }) {
  const router = useRouter();
  const [clientId, setClientId] = useState<string | null>(null);
  const [f, setF] = useState({ fromProductId: products[0]?.id ?? "", fromQuantity: "", toProductId: products[1]?.id ?? products[0]?.id ?? "", toQuantity: "", comment: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return setMsg({ tone: "error", text: "Choisissez un membre." });
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/admin/conversions", { method: "POST", json: { clientId, ...f, fromQuantity: Number(f.fromQuantity), toQuantity: Number(f.toQuantity), comment: f.comment || undefined } });
      setMsg({ tone: "success", text: "Conversion enregistrée." });
      setF({ ...f, fromQuantity: "", toQuantity: "", comment: "" });
      router.refresh();
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Erreur." });
    } finally {
      setBusy(false);
    }
  }

  const opts = products.map((p) => (
    <option key={p.id} value={p.id}>
      {p.title} ({p.sku})
    </option>
  ));

  return (
    <Card className="h-fit p-5">
      <h2 className="mb-4 font-semibold">Nouvelle conversion</h2>
      <form onSubmit={submit} className="space-y-4">
        <MemberPicker onPick={setClientId} />
        <div className="grid grid-cols-[1fr_90px] gap-3">
          <Field label="Le membre rend" htmlFor="from">
            <Select id="from" value={f.fromProductId} onChange={set("fromProductId")}>
              {opts}
            </Select>
          </Field>
          <Field label="Qté" htmlFor="fq">
            <Input id="fq" type="number" inputMode="numeric" min={1} value={f.fromQuantity} onChange={set("fromQuantity")} required />
          </Field>
        </div>
        <div className="grid grid-cols-[1fr_90px] gap-3">
          <Field label="Il reçoit" htmlFor="to">
            <Select id="to" value={f.toProductId} onChange={set("toProductId")}>
              {opts}
            </Select>
          </Field>
          <Field label="Qté" htmlFor="tq">
            <Input id="tq" type="number" inputMode="numeric" min={1} value={f.toQuantity} onChange={set("toQuantity")} required />
          </Field>
        </div>
        <Field label="Commentaire (facultatif)" htmlFor="c">
          <Input id="c" value={f.comment} onChange={set("comment")} maxLength={2000} />
        </Field>
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Button type="submit" full disabled={busy || f.fromProductId === f.toProductId}>
          Enregistrer
        </Button>
      </form>
    </Card>
  );
}
