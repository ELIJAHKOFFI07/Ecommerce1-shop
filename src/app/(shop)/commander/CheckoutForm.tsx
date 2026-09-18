"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { api } from "@/lib/api";
import { formatFcfa } from "@/lib/money";
import { Alert, Button, ButtonLink, Card, Empty, Field, Input, Money, Row, Textarea, cx } from "@/components/ui";

type Addr = { id: string; label: string; fullName: string; phone: string; city: string; commune: string | null; details: string };

/// Une seule page, trois blocs : adresse, paiement, récapitulatif. Le
/// bouton final dit ce qui va se passer (« Commander — 45 000 F »).
export function CheckoutForm({ addresses, defaults, shipping, mobileMoney }: { addresses: Addr[]; defaults: { fullName: string; phone: string }; shipping: { fee: number; freeFrom: number | null }; mobileMoney: { number: string; name: string } | null }) {
  const { lines, ready, total, clear } = useCart();
  const router = useRouter();
  const [addrId, setAddrId] = useState<string | "new">(addresses[0]?.id ?? "new");
  const [a, setA] = useState({ fullName: defaults.fullName, phone: defaults.phone, city: "", commune: "", details: "" });
  const [saveAddress, setSaveAddress] = useState(true);
  const [payment, setPayment] = useState<"CASH_ON_DELIVERY" | "MOBILE_MONEY">("CASH_ON_DELIVERY");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof a) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setA({ ...a, [k]: e.target.value });

  if (!ready) return null;
  if (lines.length === 0) return <Empty title="Votre panier est vide" action={<ButtonLink href="/">Voir la boutique</ButtonLink>} />;

  const fee = shipping.freeFrom !== null && total >= shipping.freeFrom ? 0 : shipping.fee;
  const grand = total + fee;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const chosen = addrId === "new" ? null : addresses.find((x) => x.id === addrId);
      const address = chosen ? { fullName: chosen.fullName, phone: chosen.phone, city: chosen.city, commune: chosen.commune, details: chosen.details } : { ...a, commune: a.commune || null };
      const order = await api<{ id: string }>("/api/orders", { method: "POST", json: { items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })), paymentMethod: payment, address, saveAddress: addrId === "new" && saveAddress, note: note.trim() || undefined } });
      clear();
      router.push(`/compte/commandes/${order.id}?ok=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">1 · Adresse de livraison</h2>
          {addresses.length > 0 && (
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              {addresses.map((x) => (
                <button key={x.id} type="button" onClick={() => setAddrId(x.id)} aria-pressed={addrId === x.id} className={cx("press rounded-lg border p-4 text-left", addrId === x.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted")}>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{x.label}</p>
                  <p className="mt-1 font-semibold">{x.fullName} · {x.phone}</p>
                  <p className="text-sm text-muted-foreground">{x.details}, {x.commune ? `${x.commune}, ` : ""}{x.city}</p>
                </button>
              ))}
              <button type="button" onClick={() => setAddrId("new")} aria-pressed={addrId === "new"} className={cx("press rounded-lg border border-dashed p-4 text-left font-semibold", addrId === "new" ? "border-primary bg-primary/5" : "border-border-strong hover:bg-muted")}>
                + Nouvelle adresse
              </button>
            </div>
          )}
          {addrId === "new" && (
            <Card className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nom complet" htmlFor="fn"><Input id="fn" value={a.fullName} onChange={set("fullName")} required maxLength={120} autoComplete="name" /></Field>
                <Field label="Téléphone" htmlFor="ph"><Input id="ph" type="tel" inputMode="tel" value={a.phone} onChange={set("phone")} required autoComplete="tel" placeholder="+225 07 00 00 00 00" /></Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Ville" htmlFor="city"><Input id="city" value={a.city} onChange={set("city")} required maxLength={120} autoComplete="address-level2" /></Field>
                <Field label="Commune / quartier" htmlFor="com"><Input id="com" value={a.commune} onChange={set("commune")} maxLength={120} /></Field>
              </div>
              <Field label="Adresse précise" htmlFor="det" hint="Rue, repère, nom de l’immeuble… tout ce qui aide le livreur."><Textarea id="det" value={a.details} onChange={set("details")} required minLength={3} maxLength={300} className="min-h-20" /></Field>
              <label className="flex cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="h-5 w-5 accent-primary" /> Enregistrer cette adresse pour la prochaine fois</label>
            </Card>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">2 · Paiement</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setPayment("CASH_ON_DELIVERY")} aria-pressed={payment === "CASH_ON_DELIVERY"} className={cx("press rounded-lg border p-4 text-left", payment === "CASH_ON_DELIVERY" ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted")}>
              <p className="font-semibold">Paiement à la livraison</p>
              <p className="text-sm text-muted-foreground">Vous payez en espèces au livreur.</p>
            </button>
            <button type="button" onClick={() => setPayment("MOBILE_MONEY")} aria-pressed={payment === "MOBILE_MONEY"} disabled={!mobileMoney} className={cx("press rounded-lg border p-4 text-left disabled:opacity-50", payment === "MOBILE_MONEY" ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted")}>
              <p className="font-semibold">Mobile Money</p>
              <p className="text-sm text-muted-foreground">{mobileMoney ? `Transfert au ${mobileMoney.number}${mobileMoney.name ? ` (${mobileMoney.name})` : ""}, puis confirmation par la boutique.` : "Indisponible pour le moment."}</p>
            </button>
          </div>
          {payment === "MOBILE_MONEY" && mobileMoney && (
            <Alert tone="info">Après validation, envoyez <strong>{formatFcfa(grand)}</strong> au <strong>{mobileMoney.number}</strong> avec votre numéro de commande en référence. La commande est confirmée dès réception.</Alert>
          )}
        </section>

        <Field label="Remarque pour la livraison (facultatif)" htmlFor="note"><Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} className="min-h-20" /></Field>
      </div>

      <Card className="vitrine h-fit overflow-hidden border-0 p-0 lg:sticky lg:top-24">
        <div className="socle relative px-6 py-5 text-[#f5f0e8]">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#f5f0e8]/60">Total à payer</p>
          <Money value={grand} className="mt-1 block text-4xl leading-none text-[#e5b35d]" />
        </div>
        <div className="p-6 pt-4">
          <div className="divide-y divide-border text-sm">
            {lines.map((l) => (
              <div key={l.productId} className="flex justify-between gap-3 py-2">
                <span className="min-w-0 truncate"><span className="font-semibold tabular">{l.quantity} ×</span> {l.title}</span>
                <Money value={l.price * l.quantity} className="shrink-0 text-sm" />
              </div>
            ))}
          </div>
          <div className="mt-2 border-t border-border pt-2">
            <Row label="Sous-total" value={<Money value={total} />} />
            <Row label="Livraison" value={fee === 0 ? <span className="text-success">Offerte</span> : <Money value={fee} />} />
          </div>
          {error && <div className="mt-4"><Alert tone="error">{error}</Alert></div>}
          <Button type="submit" size="lg" full className="mt-5" disabled={busy} loading={busy}>
            Commander — {formatFcfa(grand)}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">En commandant, vous confirmez vos informations de livraison.</p>
        </div>
      </Card>
    </form>
  );
}
