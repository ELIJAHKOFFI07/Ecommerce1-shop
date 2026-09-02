"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, Store } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { useSession } from "@/lib/session";
import type { Category, Product } from "@/lib/types";
import { ProductCard } from "@/components/play/ProductCard";
import { CategoryCard } from "@/components/play/CategoryCard";
import { ProductGridSkeleton } from "@/components/Skeleton";

/// Accueil de l'application — volontairement réduit à l'essentiel :
/// rechercher, parcourir par catégorie, voir les produits.
///
/// La version précédente empilait dix rubriques (stories, carrousel promo,
/// raccourcis, ventes flash, enchères, populaires, boutiques, nouveautés).
/// Le client a tranché : trop d'informations, il veut aller droit au but.
/// Ce qui a disparu n'est pas supprimé du produit — seulement retiré du
/// chemin principal, pour que l'écran d'accueil réponde à une seule
/// question : « qu'est-ce que j'achète ? ».
export default function PlayHome() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const { canSell } = useSession();
  const router = useRouter();

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
        supabase.from("categories").select("*").order("position").limit(6),
      ]);

      if (prodRes.error) setError(prodRes.error.message);
      setProducts((prodRes.data as Product[]) ?? []);
      setCategories((catRes.data as Category[]) ?? []);
      setLoading(false);
    })();
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/play/search?q=${encodeURIComponent(q)}` : "/play/search");
  }

  return (
    <div className="space-y-10 lg:space-y-14">
      {/* -------------------------------------------------------------- */}
      {/* Recherche — première chose à l'écran, c'est le point d'entrée   */}
      {/* -------------------------------------------------------------- */}
      <section className="space-y-4">
        <form onSubmit={submitSearch} className="relative">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un produit…"
            aria-label="Rechercher un produit"
            className="rounded-sm w-full border border-border bg-surface py-4 pl-14 pr-4 text-lg outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
        </form>

        {canSell && (
          <Link
            href="/play/sell"
            className="press rounded-sm inline-flex items-center gap-2 border border-border bg-surface px-4 py-2 font-display text-sm font-bold transition-colors hover:bg-surface-2"
          >
            <Store className="h-4 w-4" />
            Ma boutique
          </Link>
        )}
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Catégories — six au maximum, pour ne pas noyer le choix         */}
      {/* -------------------------------------------------------------- */}
      {categories.length > 0 && (
        <section className="space-y-5">
          <SectionTitle href="/play/search">Catégories</SectionTitle>
          <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-6">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Produits                                                        */}
      {/* -------------------------------------------------------------- */}
      <section className="space-y-5">
        <SectionTitle href="/play/search">Produits</SectionTitle>

        {error && (
          <p className="rounded-sm border border-border bg-surface px-4 py-3 text-sm text-red-500">
            {error}
          </p>
        )}

        {loading ? (
          <ProductGridSkeleton />
        ) : products.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            Aucun produit pour le moment.
          </p>
        ) : (
          // Un produit par ligne : chaque cadre est large, l'image respire et
          // le prix se lit sans effort. Une grille dense obligeait à plisser
          // les yeux sur des vignettes de 150 px.
          <div className="flex flex-col gap-5">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/// Titre de rubrique : libellé à gauche, lien « Tout voir » à droite.
/// Un seul gabarit pour les deux rubriques de la page — il n'y a plus assez
/// de variété pour justifier les icônes et sous-titres d'avant.
function SectionTitle({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="font-display text-2xl font-extrabold tracking-tight lg:text-3xl">
        {children}
      </h2>
      <Link
        href={href}
        className="press inline-flex shrink-0 items-center gap-1.5 text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Tout voir
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
