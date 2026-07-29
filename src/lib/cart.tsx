"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "./types";

export type CartLine = {
  productId: string;
  variantId: string | null;
  title: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  stock: number;
  shopId: string;
};

type CartContextValue = {
  lines: CartLine[];
  add: (product: Product, variantId?: string | null, quantity?: number) => void;
  updateQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  subtotal: number;
  count: number;
  /// false tant que le panier n'a pas été relu depuis localStorage.
  hydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "elijahshop_cart";
const MAX_PER_LINE = 20;

function keyOf(productId: string, variantId: string | null) {
  return variantId ? `${productId}::${variantId}` : productId;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  /// Le panier vit dans localStorage, illisible pendant le rendu serveur :
  /// le premier rendu est donc toujours « panier vide ». Ce drapeau permet
  /// aux écrans d'afficher un shimmer plutôt que ce faux état vide, qui
  /// s'affichait puis disparaissait dès la lecture du stockage.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        // Hydratation du panier depuis localStorage au montage.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLines(JSON.parse(raw));
      } catch {
        // panier corrompu : on repart à zéro plutôt que de planter.
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    // Ne jamais écrire avant l'hydratation : cet effet s'exécute au montage
    // avec le panier vide et écraserait le panier réellement stocké.
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const value = useMemo<CartContextValue>(() => {
    const cap = (qty: number, stock: number) =>
      Math.max(0, Math.min(qty, Math.min(stock, MAX_PER_LINE)));

    return {
      lines,
      add: (product, variantId = null, quantity = 1) => {
        const variant = product.product_variants?.find((v) => v.id === variantId);
        const unitPrice = variant?.price ?? product.price;
        const stock = variant?.stock ?? product.stock;
        setLines((prev) => {
          const k = keyOf(product.id, variantId);
          const existing = prev.find(
            (l) => keyOf(l.productId, l.variantId) === k,
          );
          if (existing) {
            return prev.map((l) =>
              keyOf(l.productId, l.variantId) === k
                ? { ...l, quantity: cap(l.quantity + quantity, stock) }
                : l,
            );
          }
          const qty = cap(quantity, stock);
          if (qty <= 0) return prev;
          return [
            ...prev,
            {
              productId: product.id,
              variantId,
              title: product.title,
              imageUrl: product.product_images?.[0]?.url ?? null,
              unitPrice,
              quantity: qty,
              stock,
              shopId: product.shop_id,
            },
          ];
        });
      },
      updateQuantity: (key, quantity) =>
        setLines((prev) =>
          quantity <= 0
            ? prev.filter((l) => keyOf(l.productId, l.variantId) !== key)
            : prev.map((l) =>
                keyOf(l.productId, l.variantId) === key
                  ? { ...l, quantity: cap(quantity, l.stock) }
                  : l,
              ),
        ),
      remove: (key) =>
        setLines((prev) =>
          prev.filter((l) => keyOf(l.productId, l.variantId) !== key),
        ),
      clear: () => setLines([]),
      subtotal: lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
      count: lines.reduce((s, l) => s + l.quantity, 0),
      hydrated,
    };
  }, [lines, hydrated]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans un CartProvider");
  return ctx;
}

export { keyOf };
