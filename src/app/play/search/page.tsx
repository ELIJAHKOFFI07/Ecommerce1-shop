"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search as SearchIcon, X } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import type { Category, Product } from "@/lib/types";
import { ProductCard } from "@/components/play/ProductCard";
import { ProductGridSkeleton } from "@/components/Skeleton";

type Sort = "recent" | "price_asc" | "price_desc" | "popular";

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "recent", label: "Récents" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix décroissant" },
  { value: "popular", label: "Populaires" },
];

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

  const wheelItems = useMemo(
    () => [
      { id: null as string | null, name: "Tout" },
      ...categories.map((c) => ({ id: c.id, name: c.name })),
    ],
    [categories],
  );

  return (
 <div className="space-y-6">
      {/* Barre de recherche (60 %) + tri (40 %), côte à côte sur grand écran.
          Le tri vit à côté de la recherche : il porte sur ce qu'on filtre,
          pas sur la roue des catégories. */}
 <div className="flex flex-wrap items-start gap-4 lg:flex-nowrap">
 <div className="w-full lg:w-[60%]">
 <div className="flex items-center gap-2 rounded-sm bg-surface px-4 py-2 transition-all focus-within:ring-2 focus-within:ring-accent">
 <SearchIcon className="h-3.5 w-3.5 shrink-0 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit…"
 className="w-full bg-transparent outline-none placeholder:text-muted"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Effacer la recherche"
 className="grid h-6 w-6 shrink-0 place-items-center rounded-sm bg-surface-2 text-muted transition-colors hover:text-foreground"
              >
 <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

 <div className="w-full lg:w-[40%]">
 <div className="flex flex-wrap items-center gap-2">
            {SORT_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSort(value)}
                aria-pressed={sort === value}
 className={` press rounded-sm px-3 py-1 text-xs font-medium transition-all ${
                  sort === value
                    ? "bg-foreground text-background"
                    : "bg-surface text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/*
        Sur mobile, la roue est horizontale en haut (arc doux, comme la
        version d'origine). Sur grand écran, elle devient un rail vertical
        défilant collé à gauche de la grille — sticky pendant le défilement.
      */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
          {wheelItems.map((wheelItem) => {
            const active = wheelItem.id === resolvedCategoryId;
            return (
              <button
                key={wheelItem.id ?? "all"}
                onClick={() => setCategoryId(wheelItem.id)}
                aria-pressed={active}
                className={`press rounded-sm px-3 py-1 text-xs font-medium whitespace-nowrap transition-all ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface text-muted hover:text-foreground"
                }`}
              >
                {wheelItem.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
        {categories.length > 0 && (
          <aside className="hidden lg:sticky lg:top-20 lg:block">
            <div className="flex flex-col gap-1">
              {wheelItems.map((wheelItem) => {
                const active = wheelItem.id === resolvedCategoryId;
                return (
                  <button
                    key={wheelItem.id ?? "all"}
                    onClick={() => setCategoryId(wheelItem.id)}
                    aria-pressed={active}
                    className={`press rounded-sm px-3 py-2 text-sm font-medium text-left transition-all ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface text-muted hover:text-foreground"
                    }`}
                  >
                    {wheelItem.name}
                  </button>
                );
              })}
            </div>
          </aside>
        )}

 <div className="min-w-0 space-y-4">
          {!loading && products.length > 0 && (
 <p className="text-sm text-muted">
              {products.length} résultat{products.length > 1 ? "s" : ""}
            </p>
          )}

          {loading ? (
            <ProductGridSkeleton />
          ) : products.length === 0 ? (
 <p className="py-16 text-center text-muted">Aucun résultat.</p>
          ) : (
 <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} hard />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton />}>
      <SearchInner />
    </Suspense>
  );
}
