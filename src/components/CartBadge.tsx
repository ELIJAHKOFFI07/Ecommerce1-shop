"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";

export function CartBadge() {
  const { count, ready } = useCart();
  return (
    <Link href="/panier" aria-label={`Panier, ${count} article${count > 1 ? "s" : ""}`} className="relative grid h-11 w-11 place-items-center rounded-md hover:bg-muted">
      <ShoppingBag className="h-5 w-5" strokeWidth={1.8} aria-hidden />
      {ready && count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-foreground">{count}</span>
      )}
    </Link>
  );
}
