"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import type { Category, Product } from "@/lib/types";
import { ProductCard } from "@/components/play/ProductCard";
import { ProductGridSkeleton } from "@/components/Skeleton";
type Sort = "recent" | "price_asc" | "price_desc" | "popular";

function SearchInner() {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(
    params.get("category"),
  );
  const [sort, setSort] = useState<Sort>("recent");
  const [categories, setCategories] = useState<Category[]>([]);
  // L'URL de la vitrine passe un `slug` (`?category=mode`), mais la vitrine
  // ne connaît pas les id UUID. On résout ici slug -> id réel pour le filtre.
  const [resolvedCategoryId, setResolvedCategoryId] = useState<string | null>(
    null,
  );
  const [products, setProducts] = useState<Product[]>([]);
  // true dès le départ : la recherche part au montage. À false, le premier
  // rendu affichait « Aucun résultat » avant même la première requête.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createClient()
      .from("categories")
      .select("*")
      .order("position")
      .then(({ data }) => {
        const cats = (data as Category[]) ?? [];
        setCategories(cats);
        const match = categoryId
          ? cats.find((c) => c.id === categoryId || c.slug === categoryId)
          : null;
        setResolvedCategoryId(match ? match.id : null);
      });
  }, [categoryId]);

  useEffect(() => {
    const supabase = createClient();
    let q = supabase
      .from("products")
      .select("*, product_images(url, position), shops(*)")
      .eq("status", "active");
    if (query.trim()) q = q.ilike("title", `%${query.trim()}%`);
    if (resolvedCategoryId) q = q.eq("category_id", resolvedCategoryId);
    switch (sort) {
      case "price_asc":
        q = q.order("price", { ascending: true });
        break;
      case "price_desc":
        q = q.order("price", { ascending: false });
        break;
      case "popular":
        q = q.order("favorites_count", { ascending: false });
        break;
      default:
        q = q.order("created_at", { ascending: false });
    }
    const handle = setTimeout(() => {
      setLoading(true);
      q.limit(48).then(({ data }) => {
        setProducts((data as Product[]) ?? []);
        setLoading(false);
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [query, resolvedCategoryId, sort]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5">
        <SearchIcon className="h-4 w-4 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un produit…"
          className="w-full bg-transparent outline-none placeholder:text-muted"
        />
      </div>

      {/* Sur grand écran, les filtres passent en colonne fixe : ils restent
          accessibles pendant qu'on fait défiler les résultats, au lieu de
          disparaître en haut de page. En dessous de `lg`, ils restent des
          pastilles horizontales, plus adaptées au pouce. */}
      <div className="grid gap-6 lg:grid-cols-[15rem_1fr] lg:items-start">
        <aside className="space-y-5 lg:sticky lg:top-20">
           <div>
            <h2 className="mb-2 text-xs uppercase tracking-wide text-muted">
              Catégories
            </h2>
            <div className="flex flex-wrap gap-2 lg:flex-col lg:items-start">
              {[
                [null, "Tout"],
                ...categories.map((c) => [c.id, c.name] as [string, string]),
              ].map(([id, label]) => (
                <FilterChip
                  key={id ?? "__all__"}
                  active={resolvedCategoryId === id}
                  onClick={() => setCategoryId(id)}
                >
                  {label}
                </FilterChip>
              ))}
            </div>
          </div>


          <div>
            <h2 className="mb-2 text-xs uppercase tracking-wide text-muted">
              Trier par
            </h2>
            <div className="flex flex-wrap gap-2 lg:flex-col lg:items-start">
              {(
                [
                  ["recent", "Récents"],
                  ["price_asc", "Prix croissant"],
                  ["price_desc", "Prix décroissant"],
                  ["popular", "Populaires"],
                ] as [Sort, string][]
              ).map(([value, label]) => (
                <FilterChip
                  key={value}
                  active={sort === value}
                  onClick={() => setSort(value)}
                >
                  {label}
                </FilterChip>
              ))}
            </div>
          </div>
        </aside>

        <div>
          {!loading && products.length > 0 && (
            <p className="mb-3 text-sm text-muted">
              {products.length} résultat{products.length > 1 ? "s" : ""}
            </p>
          )}

          {loading ? (
            <ProductGridSkeleton />
          ) : products.length === 0 ? (
            <p className="py-12 text-center text-muted">Aucun résultat.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`press rounded-full px-3 py-1.5 text-sm transition-colors lg:w-full lg:text-left ${
        active
          ? "bg-foreground font-medium text-background"
          : "bg-surface-2 text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton />}>
      <SearchInner />
    </Suspense>
  );
}
