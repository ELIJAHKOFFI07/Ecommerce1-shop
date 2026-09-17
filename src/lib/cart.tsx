"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/// Panier local (localStorage). Il ne porte que des identifiants et des
/// quantités : les prix affichés viennent du catalogue à chaque rendu, et
/// le serveur recalcule tout à la commande. Modifier le localStorage ne
/// permet donc pas de changer un prix.
export type CartLine = { productId: string; slug: string; title: string; image?: string; price: number; tva: number; quantity: number };

type Ctx = {
  lines: CartLine[];
  ready: boolean;
  add: (line: Omit<CartLine, "quantity">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: number;
  total: number;
  tax: number;
};

const CartContext = createContext<Ctx | null>(null);
const KEY = "superlifeshop.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  // Lecture du localStorage APRÈS montage : le rendu serveur n'y a pas
  // accès, lire au rendu créerait un décalage d'hydratation. Le setState
  // dans l'effet est donc voulu.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (Array.isArray(parsed)) setLines(parsed.filter((l) => l && typeof l.productId === "string" && l.quantity > 0));
      }
    } catch {
      /* stockage indisponible : panier vide */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* ignoré */
    }
  }, [lines, ready]);

  const value = useMemo<Ctx>(() => {
    const count = lines.reduce((n, l) => n + l.quantity, 0);
    const total = lines.reduce((n, l) => n + l.price * l.quantity, 0);
    const tax = Math.round(lines.reduce((n, l) => n + (l.price * l.quantity * (l.tva ?? 0)) / 100, 0));
    return {
      lines,
      ready,
      count,
      total,
      tax,
      add: (line, qty = 1) =>
        setLines((ls) => {
          const i = ls.findIndex((l) => l.productId === line.productId);
          if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, quantity: Math.min(999, l.quantity + qty) } : l));
          return [...ls, { ...line, quantity: qty }];
        }),
      setQty: (productId, qty) => setLines((ls) => (qty <= 0 ? ls.filter((l) => l.productId !== productId) : ls.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(999, qty) } : l)))),
      remove: (productId) => setLines((ls) => ls.filter((l) => l.productId !== productId)),
      clear: () => setLines([]),
    };
  }, [lines, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): Ctx {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart hors CartProvider");
  return ctx;
}
