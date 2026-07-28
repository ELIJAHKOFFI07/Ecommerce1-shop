"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/backend/client";
import type { Category, Product } from "@/lib/types";
import { ProductCard } from "@/components/play/ProductCard";
import { StoriesBar } from "@/components/play/StoriesBar";

export default function PlayHome() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [prodRes, catRes] = await Promise.all([
        supabase
          .from("products")
          .select("*, product_images(url, position), shops(*)")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(24),
        supabase.from("categories").select("*").order("position"),
      ]);
      if (prodRes.error) setError(prodRes.error.message);
      setProducts((prodRes.data as Product[]) ?? []);
      setCategories((catRes.data as Category[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <section className="mb-6">
        <StoriesBar />
      </section>

      <Link
        href="/play/auctions"
        className="mb-6 flex items-center justify-between rounded-xl border border-gold/40 bg-gold/[0.06] p-4 hover:border-gold"
      >
        <span className="font-semibold">🔨 Enchères en cours</span>
        <span className="text-sm text-gold">Faites la meilleure offre →</span>
      </Link>

      <section className="mb-8 overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-[#1f1a0c] to-[#3a2f14] p-8">
        <h1 className="text-2xl font-bold md:text-3xl">
          Achetez & vendez, en toute confiance ✦
        </h1>
        <p className="mt-2 max-w-lg text-muted">
          Des milliers de produits, des vendeurs vérifiés, la négociation et le
          paiement Mobile Money.
        </p>
        <Link
          href="/play/sell"
          className="mt-4 inline-block rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-black"
        >
          Ouvrir ma boutique
        </Link>
      </section>

      {categories.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Catégories</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/play/search?category=${cat.id}`}
                className="flex shrink-0 flex-col items-center gap-1"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-2xl">
                  {cat.icon}
                </span>
                <span className="w-16 truncate text-center text-xs text-muted">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Nouveautés</h2>
        {error && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
            Connexion impossible : {error}. Vérifiez la configuration Supabase
            (.env.local).
          </p>
        )}
        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse rounded-xl bg-surface-2"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="py-12 text-center text-muted">
            Aucun produit pour le moment.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
