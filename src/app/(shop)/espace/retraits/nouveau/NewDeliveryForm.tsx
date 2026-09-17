"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

type Stock = { productId: string; title: string; image?: string; available: number };

export function NewDeliveryForm({ stocks, defaultName, defaultPhone }: { stocks: Stock[]; defaultName: string; defaultPhone: string }) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = Object.entries(qty).filter(([, q]) => q > 0).map(([productId, quantity]) => ({ productId, quantity }));
  const setQ = (id: string, q: number, max: number) => setQty((s) => ({ ...s, [id]: Math.max(0, Math.min(max, q)) }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return setError("Choisissez au moins un produit.");
    setBusy(true);
    setError(null);
    try {
      const d = await api<{ id: string }>("/api/deliveries", { method: "POST", json: { items, recipientName: name.trim() || undefined, recipientPhone: phone.trim() || undefined } });
      router.push(`/espace/retraits/${d.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card className="divide-y divide-border px-5">
        {stocks.map((s) => {
          const q = qty[s.productId] ?? 0;
          return (
            <div key={s.productId} className="flex items-center gap-4 py-4">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {s.image ? <img src={s.image} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-muted-foreground">Disponible : {s.available}</p>
              </div>
              <div className="inline-flex h-11 items-center rounded-md border border-border-strong bg-card">
                <button type="button" aria-label={`Moins de ${s.title}`} onClick={() => setQ(s.productId, q - 1, s.available)} className="grid h-full w-11 cursor-pointer place-items-center hover:bg-muted">
                  <Minus className="h-4 w-4" aria-hidden />
                </button>
                <span className="w-10 text-center font-semibold tabular">{q}</span>
                <button type="button" aria-label={`Plus de ${s.title}`} onClick={() => setQ(s.productId, q + 1, s.available)} className="grid h-full w-11 cursor-pointer place-items-center hover:bg-muted">
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          );
        })}
      </Card>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Qui vient retirer ?" htmlFor="name">
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </Field>
        <Field label="Téléphone" htmlFor="phone">
          <Input id="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" size="lg" full disabled={busy || items.length === 0} loading={busy}>
        {busy ? "Envoi…" : `Demander le retrait${items.length ? ` (${items.reduce((n, i) => n + i.quantity, 0)})` : ""}`}
      </Button>
    </form>
  );
}
