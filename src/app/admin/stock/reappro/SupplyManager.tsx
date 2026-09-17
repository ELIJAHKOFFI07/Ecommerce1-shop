"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert, Button, Card, Empty, Field, Input, Select, StatusPill, fmtDate } from "@/components/ui";
import { ActionButton } from "@/components/admin";

type Order = { id: string; quantity: number; quantityBureau: number | null; quantityEntrepot: number | null; status: string; note: string | null; createdAt: string; receivedAt: string | null; product: { id: string; title: string }; createdBy: { name: string } };
type Product = { id: string; title: string; sku: string };

export function SupplyManager({ orders, products, canEdit }: { orders: Order[]; products: Product[]; canEdit: boolean }) {
  const router = useRouter();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/stock/supply", { method: "POST", json: { productId, quantity: Number(quantity), note: note || undefined } });
      setQuantity("");
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      {canEdit && (
        <Card className="h-fit p-5">
          <h2 className="mb-4 font-semibold">Nouvelle commande</h2>
          <form onSubmit={create} className="space-y-4">
            <Field label="Produit" htmlFor="p">
              <Select id="p" value={productId} onChange={(e) => setProductId(e.target.value)} required>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.sku})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Quantité commandée" htmlFor="q">
              <Input id="q" type="number" inputMode="numeric" min={1} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </Field>
            <Field label="Note (facultatif)" htmlFor="n">
              <Input id="n" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
            </Field>
            {error && <Alert tone="error">{error}</Alert>}
            <Button type="submit" full disabled={busy || !productId} loading={busy}>
              Enregistrer la commande
            </Button>
          </form>
        </Card>
      )}
      <div>
        {orders.length === 0 ? (
          <Empty title="Aucune commande fournisseur" />
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {o.quantity} × {o.product.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {fmtDate(o.createdAt)} · {o.createdBy.name}
                        {o.note && ` · ${o.note}`}
                      </p>
                      {o.status === "RECEIVED" && (
                        <p className="mt-1 text-sm">
                          Reçue le {o.receivedAt ? fmtDate(o.receivedAt) : "—"} : bureau {o.quantityBureau}, entrepôt {o.quantityEntrepot}
                        </p>
                      )}
                    </div>
                    <StatusPill status={o.status} />
                  </div>
                  {canEdit && o.status === "PENDING" && <ReceiveForm order={o} />}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ReceiveForm({ order }: { order: Order }) {
  const router = useRouter();
  const [bureau, setBureau] = useState(String(order.quantity));
  const [entrepot, setEntrepot] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sum = Number(bureau) + Number(entrepot);

  async function receive(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/stock/supply/${order.id}`, { method: "PATCH", json: { status: "RECEIVED", quantityBureau: Number(bureau), quantityEntrepot: Number(entrepot) } });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={receive} className="mt-4 space-y-3 rounded-md bg-muted p-4">
      <p className="text-sm font-semibold">Réception : répartir {order.quantity} unités</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Au bureau" htmlFor={`b-${order.id}`}>
          <Input id={`b-${order.id}`} type="number" inputMode="numeric" min={0} step={1} value={bureau} onChange={(e) => setBureau(e.target.value)} />
        </Field>
        <Field label="À l’entrepôt" htmlFor={`e-${order.id}`}>
          <Input id={`e-${order.id}`} type="number" inputMode="numeric" min={0} step={1} value={entrepot} onChange={(e) => setEntrepot(e.target.value)} />
        </Field>
      </div>
      {sum !== order.quantity && <p className="text-sm text-destructive">Total {sum} ≠ {order.quantity}.</p>}
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy || sum !== order.quantity} loading={busy}>
          Marquer reçue
        </Button>
        <ActionButton path={`/api/admin/stock/supply/${order.id}`} method="PATCH" body={{ status: "CANCELLED" }} variant="ghost" confirm="Annuler cette commande fournisseur ?">
          Annuler la commande
        </ActionButton>
      </div>
    </form>
  );
}
