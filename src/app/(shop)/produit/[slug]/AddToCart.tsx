"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Check } from "lucide-react";
import { useCart, type CartLine } from "@/lib/cart";
import { Button } from "@/components/ui";

/// Un compteur, un bouton. Après l'ajout, le bouton confirme puis propose
/// d'aller au panier — pas de fenêtre surgissante à fermer.
export function AddToCart({ product }: { product: Omit<CartLine, "quantity"> }) {
  const { add } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  return (
    <div className="space-y-4">
      <div className="inline-flex h-14 items-center rounded-md border border-border-strong bg-card">
        <button type="button" aria-label="Diminuer" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-full w-14 cursor-pointer place-items-center hover:bg-muted">
          <Minus className="h-5 w-5" aria-hidden />
        </button>
        <span className="w-14 text-center text-xl font-semibold tabular" aria-live="polite">
          {qty}
        </span>
        <button type="button" aria-label="Augmenter" onClick={() => setQty((q) => Math.min(999, q + 1))} className="grid h-full w-14 cursor-pointer place-items-center hover:bg-muted">
          <Plus className="h-5 w-5" aria-hidden />
        </button>
      </div>
      {added ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={() => router.push("/panier")} className="sm:flex-1">
            Voir le panier
          </Button>
          <Button size="lg" variant="secondary" onClick={() => router.push("/")}>
            Continuer mes achats
          </Button>
        </div>
      ) : (
        <Button
          size="lg"
          full
          onClick={() => {
            add(product, qty);
            setAdded(true);
          }}
        >
          <Check className="h-5 w-5" aria-hidden /> Ajouter au panier
        </Button>
      )}
    </div>
  );
}
