"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { Button, ButtonLink, Empty, Money, PageTitle, Skeleton, Card } from "@/components/ui";

export default function CartPage() {
  const { lines, ready, setQty, remove, total, count } = useCart();

  if (!ready) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <>
        <PageTitle title="Panier" />
        <Empty title="Votre panier est vide" hint="Ajoutez des produits depuis la boutique." action={<ButtonLink href="/">Voir la boutique</ButtonLink>} />
      </>
    );
  }

  return (
    <>
      <PageTitle title="Panier" subtitle={`${count} article${count > 1 ? "s" : ""}`} />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y divide-border">
          {lines.map((l) => (
            <li key={l.productId} className="flex gap-4 py-5">
              <Link href={`/produit/${l.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {l.image ? <img src={l.image} alt="" className="h-full w-full object-cover" /> : null}
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/produit/${l.slug}`} className="font-medium leading-snug hover:underline">
                    {l.title}
                  </Link>
                  <Money value={l.price * l.quantity} className="shrink-0 text-xl" />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="inline-flex h-11 items-center rounded-md border border-border-strong bg-card">
                    <button type="button" aria-label="Diminuer" onClick={() => setQty(l.productId, l.quantity - 1)} className="grid h-full w-11 cursor-pointer place-items-center hover:bg-muted">
                      <Minus className="h-4 w-4" aria-hidden />
                    </button>
                    <span className="w-10 text-center font-semibold tabular">{l.quantity}</span>
                    <button type="button" aria-label="Augmenter" onClick={() => setQty(l.productId, l.quantity + 1)} className="grid h-full w-11 cursor-pointer place-items-center hover:bg-muted">
                      <Plus className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <button type="button" onClick={() => remove(l.productId)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-destructive">
                    <Trash2 className="h-4 w-4" aria-hidden /> Retirer
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <Card className="h-fit p-6 lg:sticky lg:top-24">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Total hors TVA</span>
            <Money value={total} className="text-3xl" />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">La TVA se règle au retrait des produits.</p>
          <ButtonLink href="/commander" size="lg" full className="mt-6">
            Envoyer mon reçu
          </ButtonLink>
          <p className="mt-3 text-center text-sm text-muted-foreground">Vous avez payé ces produits ? Envoyez le reçu pour les recevoir dans votre stock.</p>
          <Button variant="ghost" full className="mt-2" onClick={() => history.back()}>
            Continuer mes achats
          </Button>
        </Card>
      </div>
    </>
  );
}
