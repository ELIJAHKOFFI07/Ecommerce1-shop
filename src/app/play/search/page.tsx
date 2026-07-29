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
  const [products, setProducts] = useState<Product[]>([]);
  // true dès le départ : la recherche part au montage. À false, le premier
  // rendu affichait « Aucun résultat » avant même la première requête.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createClient()
      .from("categories")
      .select("*")
      .order("position")
      .then(({ data }) => setCategories((data as Category[]) ?? []));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let q = supabase
      .from("products")
      .select("*, product_images(url, position), shops(*)")
      .eq("status", "active");
    if (query.trim()) q = q.ilike("title", `%${query.trim()}%`);
    if (categoryId) q = q.eq("category_id", categoryId);
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
  }, [query, categoryId, sort]);

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

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryId(null)}
          className={`rounded-full px-3 py-1 text-sm ${
            categoryId === null ? "bg-gold text-black" : "bg-surface-2 text-muted"
          }`}
        >
          Tout
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryId(cat.id)}
            className={`rounded-full px-3 py-1 text-sm ${
              categoryId === cat.id
                ? "bg-gold text-black"
                : "bg-surface-2 text-muted"
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        {(
          [
            ["recent", "Récents"],
            ["price_asc", "Prix ↑"],
            ["price_desc", "Prix ↓"],
            ["popular", "Populaires"],
          ] as [Sort, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setSort(value)}
            className={`rounded-full px-3 py-1 text-sm ${
              sort === value ? "bg-gold text-black" : "bg-surface-2 text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <ProductGridSkeleton />
      ) : products.length === 0 ? (
        <p className="py-12 text-center text-muted">Aucun résultat.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
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
