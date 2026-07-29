"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart, keyOf } from "@/lib/cart";
import { formatFcfa } from "@/lib/types";
import { HeaderSkeleton, ListSkeleton } from "@/components/Skeleton";

export default function CartPage() {
  const { lines, updateQuantity, remove, subtotal, count, hydrated } =
    useCart();

  // Le panier n'est lisible qu'après lecture de localStorage : sans ce
  // garde, « Votre panier est vide » s'affichait puis disparaissait.
  if (!hydrated) {
    return (
      <div className="space-y-6">
        <HeaderSkeleton />
        <ListSkeleton count={3} />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-medium">Votre panier est vide</p>
        <p className="mt-1 text-muted">Parcourez les nouveautés et ajoutez vos coups de cœur.</p>
        <Link
          href="/play"
          className="mt-6 inline-block rounded-full bg-gold px-6 py-2.5 font-semibold text-black"
        >
          Découvrir
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Panier ({count})</h1>
      <div className="space-y-3">
        {lines.map((line) => {
          const k = keyOf(line.productId, line.variantId);
          return (
            <div
              key={k}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                {line.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={line.imageUrl}
                    alt={line.title}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-medium">{line.title}</p>
                <p className="text-sm text-gold">{formatFcfa(line.unitPrice)}</p>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border">
                <button
                  onClick={() => updateQuantity(k, line.quantity - 1)}
                  className="p-2"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-sm">{line.quantity}</span>
                <button
                  onClick={() => updateQuantity(k, line.quantity + 1)}
                  className="p-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <button onClick={() => remove(k)} className="p-2 text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <span className="text-muted">Sous-total</span>
          <span className="text-lg font-bold">{formatFcfa(subtotal)}</span>
        </div>
        <Link
          href="/play/checkout"
          className="mt-4 block rounded-full bg-gold py-3 text-center font-semibold text-black"
        >
          Passer la commande
        </Link>
      </div>
    </div>
  );
}
