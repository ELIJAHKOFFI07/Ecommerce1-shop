import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";
import { Empty, cx } from "@/components/ui";

export const dynamic = "force-dynamic";

/// Boutique : une recherche, des catégories, des produits. C'est tout.
export default async function ShopPage({ searchParams }: { searchParams: Promise<{ q?: string; categorie?: string }> }) {
  const { q, categorie } = await searchParams;
  const query = q?.trim().slice(0, 80);
  const [categories, products] = await Promise.all([
    db.category.findMany({ where: { products: { some: { active: true } } }, select: { name: true, slug: true }, orderBy: { name: "asc" } }),
    db.product.findMany({
      where: {
        active: true,
        ...(query ? { OR: [{ title: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }] } : {}),
        ...(categorie ? { categories: { some: { slug: categorie } } } : {}),
      },
      select: { id: true, slug: true, title: true, price: true, images: true, categories: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
  ]);

  return (
    <div className="space-y-8">
      <form action="/" method="get" role="search" className="relative">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          name="q"
          defaultValue={query ?? ""}
          placeholder="Rechercher un produit"
          aria-label="Rechercher un produit"
          className="h-14 w-full rounded-lg border border-border-strong bg-card pl-14 pr-4 text-lg placeholder:text-muted-foreground/70 focus:border-foreground focus:outline-none"
        />
        {categorie && <input type="hidden" name="categorie" value={categorie} />}
      </form>

      {categories.length > 0 && (
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Catégories">
          <CatLink href="/" active={!categorie}>
            Tout
          </CatLink>
          {categories.map((c) => (
            <CatLink key={c.slug} href={`/?categorie=${c.slug}${query ? `&q=${encodeURIComponent(query)}` : ""}`} active={categorie === c.slug}>
              {c.name}
            </CatLink>
          ))}
        </nav>
      )}

      {products.length === 0 ? (
        <Empty title="Aucun produit trouvé" hint={query ? "Essayez un autre mot." : "Le catalogue est vide pour le moment."} />
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function CatLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cx("press shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors", active ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-card hover:bg-muted")}
    >
      {children}
    </Link>
  );
}
