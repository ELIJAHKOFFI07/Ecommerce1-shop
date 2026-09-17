"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { api, uploadFile } from "@/lib/api";
import { Button, ButtonLink, Card, Empty, Field, Input, Money, Alert, Textarea } from "@/components/ui";

export function CheckoutForm() {
  const { lines, ready, total, clear } = useCart();
  const router = useRouter();
  const [claimReference, setClaimReference] = useState("");
  const [salesNo, setSalesNo] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready) return null;
  if (lines.length === 0) {
    return <Empty title="Votre panier est vide" hint="Ajoutez d’abord les produits figurant sur votre reçu." action={<ButtonLink href="/">Voir la boutique</ButtonLink>} />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let receiptUrl: string | undefined;
      if (file) receiptUrl = (await uploadFile(file, "receipt")).url;
      const order = await api<{ id: string }>("/api/orders", {
        method: "POST",
        json: { items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })), claimReference: claimReference.trim(), salesNo: salesNo.trim() || undefined, receiptUrl, note: note.trim() || undefined },
      });
      clear();
      router.push(`/espace/commandes/${order.id}?envoyee=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card className="divide-y divide-border px-5">
        {lines.map((l) => (
          <div key={l.productId} className="flex items-center justify-between gap-3 py-3.5">
            <span className="min-w-0 truncate">
              <span className="font-semibold tabular">{l.quantity} ×</span> {l.title}
            </span>
            <Money value={l.price * l.quantity} className="shrink-0 text-lg" />
          </div>
        ))}
        <div className="flex items-baseline justify-between py-4">
          <span className="font-semibold">Total hors TVA</span>
          <Money value={total} className="text-2xl" />
        </div>
      </Card>

      <Field label="Claim Reference" htmlFor="ref" hint="Sur votre facture SuperLife, ligne « Claim Reference ». Chaque facture ne peut être envoyée qu’une fois.">
        <Input id="ref" value={claimReference} onChange={(e) => setClaimReference(e.target.value)} required minLength={3} maxLength={60} placeholder="Ex. : MYTEDIVOIRSPC2512f2f83" autoComplete="off" autoCapitalize="characters" />
      </Field>

      <Field label="Sales No (facultatif)" htmlFor="sales" hint="Ligne « Sales No » de la facture — aide l’administration à vérifier plus vite.">
        <Input id="sales" value={salesNo} onChange={(e) => setSalesNo(e.target.value)} maxLength={60} placeholder="Ex. : MYTEDIVOIRCSB251200487" autoComplete="off" autoCapitalize="characters" />
      </Field>

      <Field label="Facture SuperLife (PDF ou photo)" htmlFor="file" hint="Le PDF reçu par e-mail, ou une photo nette. 8 Mo maximum.">
        <input id="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm file:mr-4 file:h-11 file:cursor-pointer file:rounded-md file:border file:border-border-strong file:bg-card file:px-4 file:font-semibold" />
      </Field>

      <Field label="Remarque (facultatif)" htmlFor="note">
        <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
      </Field>

      {error && <Alert tone="error">{error}</Alert>}

      <Button type="submit" size="lg" full disabled={busy}>
        {busy ? "Envoi en cours…" : "Envoyer le reçu"}
      </Button>
    </form>
  );
}
