"use client";

import { useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { useCart, type CartLine } from "@/lib/cart";
import { cx } from "./ui";

/// Bouton « Ajouter » d'une carte produit. Confirme sur place pendant
/// 1,6 s (« Ajouté ») puis redevient disponible — pas de fenêtre, pas de
/// notification qui se superpose à la page. `tone="gold"` pour le socle
/// sombre de la vitrine.
export function QuickAdd({ product, tone = "ink" }: { product: Omit<CartLine, "quantity">; tone?: "ink" | "gold" }) {
  const { add } = useCart();
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1600);
    return () => clearTimeout(t);
  }, [done]);
  const idle = tone === "gold" ? "bg-[#e5b35d] text-[#1c1917] hover:bg-[#f0c470]" : "bg-primary text-primary-foreground hover:bg-secondary";
  return (
    <button
      type="button"
      onClick={() => {
        add(product, 1);
        setDone(true);
      }}
      aria-live="polite"
      className={cx("press inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-4 text-sm font-bold transition-colors duration-300", done ? "bg-success text-white" : idle)}
    >
      {done ? <Check className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
      {done ? "Ajouté" : "Ajouter"}
    </button>
  );
}
