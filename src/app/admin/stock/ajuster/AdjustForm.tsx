"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

type P = { id: string; title: string; sku: string; stock: number };

/// Un formulaire, un bouton. Le sens (+/−) découle du motif : réception
/// et retour ajoutent, perte retire, ajustement laisse choisir.
export function AdjustForm({ products, initialProductId }: { products: P[]; initialProductId: string }) {
  const router = useRouter();
  const [productId, setProductId] = useState(initialProductId || products[0]?.id || "");
  const [reason, setReason] = useState<"RECEPTION" | "RETURN" | "LOSS" | "ADJUSTMENT">("RECEPTION");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const product = products.find((p) => p.id === productId);
  const sign = reason === "LOSS" ? -1 : reason === "ADJUSTMENT" ? (direction === "out" ? -1 : 1) : 1;
  const n = Number(qty) || 0;
  const after = product ? product.stock + sign * n : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/admin/stock/movements", { method: "POST", json: { productId, quantity: sign * n, reason, note: note.trim() || undefined } });
      setMsg({ tone: "success", text: `Stock de « ${product?.title} » mis à jour : ${after}.` });
      setQty("");
      setNote("");
      router.refresh();
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : "Erreur." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-5">
        <Field label="Produit" htmlFor="p">
          <Select id="p" value={productId} onChange={(e) => setProductId(e.target.value)} required>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.title} — {p.sku} (en stock : {p.stock})</option>
            ))}
          </Select>
        </Field>
        <Field label="Motif" htmlFor="r">
          <Select id="r" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
            <option value="RECEPTION">Réception (ajoute)</option>
            <option value="RETURN">Retour client (ajoute)</option>
            <option value="LOSS">Perte / casse (retire)</option>
            <option value="ADJUSTMENT">Ajustement après inventaire</option>
          </Select>
        </Field>
        {reason === "ADJUSTMENT" && (
          <Field label="Sens" htmlFor="d">
            <Select id="d" value={direction} onChange={(e) => setDirection(e.target.value as "in" | "out")}>
              <option value="in">Ajouter</option>
              <option value="out">Retirer</option>
            </Select>
          </Field>
        )}
        <Field label="Quantité" htmlFor="q">
          <Input id="q" type="number" inputMode="numeric" min={1} max={100000} step={1} value={qty} onChange={(e) => setQty(e.target.value)} required autoFocus />
        </Field>
        <Field label="Note (facultatif)" htmlFor="n" hint="Ex. : bon de livraison n° 123."><Textarea id="n" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} className="min-h-20" /></Field>
        {product && n > 0 && (
          <Alert tone={after < 0 ? "error" : "info"}>
            {product.title} : {product.stock} → <strong>{after}</strong>
          </Alert>
        )}
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Button type="submit" size="lg" full disabled={busy || !product || n <= 0 || after < 0} loading={busy}>
          {sign > 0 ? `Ajouter ${n || ""} au stock` : `Retirer ${n || ""} du stock`}
        </Button>
      </form>
    </Card>
  );
}
