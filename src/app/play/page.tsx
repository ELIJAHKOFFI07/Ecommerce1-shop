"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/backend/client";
import { useSession } from "@/lib/session";
import type { Category, Product } from "@/lib/types";
import { ProductCard } from "@/components/play/ProductCard";
import { StoriesBar } from "@/components/play/StoriesBar";
import { ProductGridSkeleton } from "@/components/Skeleton";

export default function PlayHome() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasShop, setHasShop] = useState(false);
  const { canSell, profile } = useSession();

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

  // Le hero ne propose « Ouvrir ma boutique » qu'aux vendeurs qui n'en ont
  // pas encore ; sinon il renvoie vers la gestion de la boutique.
  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    (async () => {
      const { data } = await createClient()
        .from("shops")
        .select("id")
        .eq("owner_id", profile.id)
        .maybeSingle();
      if (!cancelled) setHasShop(data != null);
    })();
    // Réinitialise au changement de compte (ou à la déconnexion) pour ne pas
    // garder l'état de la session précédente.
    return () => {
      cancelled = true;
      setHasShop(false);
    };
  }, [profile]);

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

      {/* Dégradé exprimé à partir de l'accent du thème : la version codée en
          dur restait sombre en mode clair et rendait le texte illisible. */}
      <section className="mb-8 overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/15 to-gold/[0.03] p-6 md:p-8">
        <h1 className="text-2xl font-bold md:text-3xl">
          {hasShop
            ? "Votre boutique vous attend ✦"
            : "Achetez & vendez, en toute confiance ✦"}
        </h1>
        <p className="mt-2 max-w-lg text-muted">
          {hasShop
            ? "Gérez vos produits, suivez vos commandes et vos ventes."
            : "Des milliers de produits, des vendeurs vérifiés, la négociation et le paiement Mobile Money."}
        </p>
        {canSell && (
          <Link
            href="/play/sell"
            className="mt-4 inline-block rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-black"
          >
            {hasShop ? "Gérer ma boutique" : "Ouvrir ma boutique"}
          </Link>
        )}
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
          <ProductGridSkeleton />
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
