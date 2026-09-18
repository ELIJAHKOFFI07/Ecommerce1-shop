import Link from "next/link";
import { getCatalog } from "@/lib/catalog";
import { Catalog } from "./Catalog";
import { ProductCard } from "@/components/ProductCard";

/// Accueil : une accroche courte, les rayons, les produits mis en avant,
/// puis tout le catalogue avec recherche et filtres instantanés.
export default async function ShopPage({ searchParams }: { searchParams: Promise<{ q?: string; categorie?: string }> }) {
  const [{ products, categories, settings }, sp] = await Promise.all([getCatalog(), searchParams]);
  const filtering = Boolean(sp.q || sp.categorie);
  const featured = products.filter((p) => p.featured && p.inStock).slice(0, 3);

  return (
    <div className="space-y-12">
      {!filtering && (
        <section className="socle relative overflow-hidden rounded-[18px] px-6 py-10 text-[#f5f0e8] sm:px-10 sm:py-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#e5b35d]">{settings.siteName}</p>
          <h1 className="font-display mt-3 max-w-xl text-4xl font-semibold leading-[1.05] sm:text-6xl">Des produits choisis, livrés chez vous.</h1>
          <p className="mt-4 max-w-md text-[#f5f0e8]/75">
            Commandez en ligne, payez à la livraison ou par Mobile Money.
            {settings.freeShippingThreshold ? ` Livraison offerte dès ${settings.freeShippingThreshold.toLocaleString("fr-FR")} F.` : ""}
          </p>
          <a href="#catalogue" className="press mt-8 inline-flex h-12 items-center rounded-md bg-[#e5b35d] px-6 font-bold text-[#1c1917] hover:bg-[#f0c470]">
            Voir les produits
          </a>
        </section>
      )}

      {!filtering && categories.length > 0 && (
        <section>
          <h2 className="font-display mb-4 text-3xl font-semibold">Rayons</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c) => (
              <Link key={c.slug} href={`/?categorie=${c.slug}#catalogue`} className="vitrine group relative overflow-hidden rounded-[14px] bg-card">
                <div className="scene relative aspect-[4/3] p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.image ? <img src={c.image} alt="" className="product-img relative z-10 h-full w-full object-contain" /> : <div className="grid h-full place-items-center font-display text-5xl text-stone-300">{c.name[0]}</div>}
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-sm text-muted-foreground">{c.count}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!filtering && featured.length > 0 && (
        <section>
          <h2 className="font-display mb-4 text-3xl font-semibold">À la une</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section id="catalogue" className="scroll-mt-20">
        <h2 className="font-display mb-4 text-3xl font-semibold">{filtering ? "Résultats" : "Tous les produits"}</h2>
        <Catalog products={products} categories={categories} initialQuery={sp.q ?? ""} initialCategory={sp.categorie ?? ""} />
      </section>
    </div>
  );
}
