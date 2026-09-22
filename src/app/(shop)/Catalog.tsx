"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { CatalogProduct, CatalogCategory } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import { Empty, cx } from "@/components/ui";

/// Recherche et filtre par catégorie côté navigateur : le catalogue
/// complet est déjà là, aucun appel réseau au clic. L'URL est mise à jour
/// (replaceState) pour que le retour arrière et le partage de lien
/// fonctionnent, sans déclencher de navigation.
export function Catalog({ products, categories, initialQuery, initialCategory }: { products: CatalogProduct[]; categories: CatalogCategory[]; initialQuery: string; initialCategory: string }) {
  const [q, setQ] = useState(initialQuery);
  const [cat, setCat] = useState(initialCategory);

  function sync(nextQ: string, nextCat: string) {
    const p = new URLSearchParams();
    if (nextQ.trim()) p.set("q", nextQ.trim());
    if (nextCat) p.set("categorie", nextCat);
    const s = p.toString();
    window.history.replaceState(null, "", (s ? `/?${s}` : "/") + "#catalogue");
  }

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => (!cat || p.categories.some((c) => c.slug === cat)) && (!needle || p.title.toLowerCase().includes(needle) || (p.description ?? "").toLowerCase().includes(needle) || p.sku.toLowerCase().includes(needle)));
  }, [products, q, cat]);

  return (
    <div className="space-y-8">
      <div className="relative">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            sync(e.target.value, cat);
          }}
          placeholder="Rechercher un produit"
          aria-label="Rechercher un produit"
          className="h-14 w-full rounded-lg border border-border-strong bg-card pl-14 pr-4 text-lg placeholder:text-muted-foreground/70 focus:border-foreground focus:outline-none"
        />
      </div>

      {categories.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Catégories">
          <Chip active={!cat} onClick={() => { setCat(""); sync(q, ""); }}>
            Tout
          </Chip>
          {categories.map((c) => (
            <Chip key={c.slug} active={cat === c.slug} onClick={() => { setCat(c.slug); sync(q, c.slug); }}>
              {c.name}
            </Chip>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <Empty title="Aucun produit trouvé" hint={q ? "Essayez un autre mot." : "Le catalogue est vide pour le moment."} />
      ) : (
        <div key={`${cat}|${q}`} className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="tab" aria-selected={active} onClick={onClick} className={cx("press shrink-0 cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-colors", active ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-card hover:bg-muted")}>
      {children}
    </button>
  );
}
