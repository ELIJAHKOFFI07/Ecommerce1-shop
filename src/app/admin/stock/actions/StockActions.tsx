"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert, Button, Card, Field, Input, Select, Textarea, cx } from "@/components/ui";

type P = { id: string; title: string; sku: string; stockVirtuel: number; stockDisponible: number; stockBureau: number; stockEntrepot: number };
const LOCS = [
  { v: "VIRTUEL", l: "Virtuel" },
  { v: "DISPONIBLE", l: "Disponible" },
  { v: "BUREAU", l: "Bureau" },
  { v: "ENTREPOT", l: "Entrepôt" },
] as const;

/// Deux opérations sur un même écran, à onglets : transférer entre deux
/// emplacements, ou ajuster un emplacement (+/−) avec un motif.
export function StockActions({ products, initialProductId, initialTab = "transfer" }: { products: P[]; initialProductId?: string; initialTab?: "transfer" | "adjust" }) {
  const router = useRouter();
  const [tab, setTab] = useState<"transfer" | "adjust">(initialTab);
  const [productId, setProductId] = useState(initialProductId && products.some((p) => p.id === initialProductId) ? initialProductId : products[0]?.id ?? "");
  const p = products.find((x) => x.id === productId);
  const [from, setFrom] = useState<string>("ENTREPOT");
  const [to, setTo] = useState<string>("BUREAU");
  const [loc, setLoc] = useState<string>("BUREAU");
  const [qty, setQty] = useState("");
  const [sign, setSign] = useState<"+" | "-">("+");
  const [reason, setReason] = useState<"ADJUSTMENT" | "LOSS" | "RETURN" | "RECEPTION">("ADJUSTMENT");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (tab === "transfer") {
        await api("/api/admin/stock/transfer", { method: "POST", json: { productId, from, to, quantity: Number(qty), note: note || undefined } });
        setMsg({ tone: "success", text: `${qty} unité(s) transférée(s).` });
      } else {
        await api("/api/admin/stock/movements", { method: "POST", json: { productId, location: loc, quantity: Number(qty) * (sign === "-" ? -1 : 1), reason, note: note || undefined } });
        setMsg({ tone: "success", text: "Ajustement enregistré." });
      }
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
      <div className="mb-5 flex gap-1 rounded-md bg-muted p-1" role="tablist">
        {(["transfer", "adjust"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx("flex-1 cursor-pointer rounded px-3 py-2 text-sm font-semibold", tab === t ? "bg-card shadow-sm" : "text-muted-foreground")}>
            {t === "transfer" ? "Transférer" : "Ajouter / retirer"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Produit" htmlFor="prod">
          <Select id="prod" value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products.map((x) => (
              <option key={x.id} value={x.id}>
                {x.title} ({x.sku})
              </option>
            ))}
          </Select>
        </Field>
        {p && (
          <p className="text-sm text-muted-foreground">
            Virtuel {p.stockVirtuel} · Disponible {p.stockDisponible} · Bureau {p.stockBureau} · Entrepôt {p.stockEntrepot}
          </p>
        )}
        {tab === "transfer" ? (
          <div className="grid grid-cols-2 gap-4">
            <Field label="De" htmlFor="from">
              <Select id="from" value={from} onChange={(e) => setFrom(e.target.value)}>
                {LOCS.map((l) => (
                  <option key={l.v} value={l.v}>
                    {l.l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Vers" htmlFor="to">
              <Select id="to" value={to} onChange={(e) => setTo(e.target.value)}>
                {LOCS.map((l) => (
                  <option key={l.v} value={l.v}>
                    {l.l}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Emplacement" htmlFor="loc">
              <Select id="loc" value={loc} onChange={(e) => setLoc(e.target.value)}>
                {LOCS.map((l) => (
                  <option key={l.v} value={l.v}>
                    {l.l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Motif" htmlFor="reason">
              <Select id="reason" value={reason} onChange={(e) => setReason(e.target.value as never)}>
                <option value="ADJUSTMENT">Correction d’inventaire</option>
                <option value="RECEPTION">Réception</option>
                <option value="RETURN">Retour</option>
                <option value="LOSS">Perte / casse</option>
              </Select>
            </Field>
          </div>
        )}
        <div className="flex gap-3">
          {tab === "adjust" && (
            <div className="flex overflow-hidden rounded-md border border-border-strong">
              {(["+", "-"] as const).map((s) => (
                <button key={s} type="button" aria-pressed={sign === s} onClick={() => setSign(s)} className={cx("w-14 cursor-pointer text-xl font-bold", sign === s ? "bg-primary text-primary-foreground" : "bg-card")}>
                  {s}
                </button>
              ))}
            </div>
          )}
          <Input type="number" inputMode="numeric" min={1} step={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Quantité" aria-label="Quantité" required className="flex-1" />
        </div>
        <Field label="Note (facultatif)" htmlFor="note">
          <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} className="min-h-20" />
        </Field>
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Button type="submit" full disabled={busy || !productId || (tab === "transfer" && from === to)} loading={busy}>
          {busy ? "…" : tab === "transfer" ? "Transférer" : "Enregistrer l’ajustement"}
        </Button>
      </form>
    </Card>
  );
}
