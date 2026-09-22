import Link from "next/link";
import { getCatalog } from "@/lib/catalog";
import { Catalog } from "./Catalog";
import { Showcase } from "./Showcase";
import { ProductCard } from "@/components/ProductCard";
import { cx } from "@/components/ui";

/// Accueil : la vedette (produits à la une), les rayons en mosaïque, puis
/// tout le catalogue avec recherche et filtres instantanés.
export default async function ShopPage({ searchParams }: { searchParams: Promise<{ q?: string; categorie?: string }> }) {
  const [{ products, categories, settings }, sp] = await Promise.all([getCatalog(), searchParams]);
  const filtering = Boolean(sp.q || sp.categorie);
  const featured = products.filter((p) => p.featured).slice(0, 4);
  const hero = featured.length > 0 ? featured : products.slice(0, 3);

  return (
    <div className="space-y-14">
      {!filtering && hero.length > 0 && <Showcase products={hero} siteName={settings.siteName} />}

      {!filtering && categories.length > 0 && (
        <section>
          <div className="mb-5 flex items-end justify-between">
            <h2 className="font-display text-3xl font-semibold">Rayons</h2>
            <span className="text-sm text-muted-foreground">{products.length} produits</span>
          </div>
          <div className="stagger grid auto-rows-[150px] grid-cols-2 gap-4 sm:auto-rows-[180px] lg:grid-cols-4">
            {categories.map((c, i) => (
              <Link key={c.slug} href={`/?categorie=${c.slug}#catalogue`} className={cx("vitrine group relative overflow-hidden rounded-[16px] bg-card", i === 0 && "col-span-2 row-span-2", i === 3 && "lg:col-span-2")}>
                <div className="scene absolute inset-0 p-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.image ? <img src={c.image} alt="" className="product-img relative z-10 h-full w-full object-contain" /> : <div className="grid h-full place-items-center font-display text-7xl text-stone-300/80">{c.name[0]}</div>}
                </div>
                <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between bg-gradient-to-t from-[#1c1917]/85 via-[#1c1917]/40 to-transparent px-4 pb-3 pt-10 text-[#f5f0e8]">
                  <span className={cx("font-display font-semibold leading-none", i === 0 ? "text-4xl" : "text-2xl")}>{c.name}</span>
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold backdrop-blur">{c.count}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!filtering && featured.length > 0 && (
        <section>
          <h2 className="font-display mb-5 text-3xl font-semibold">À la une</h2>
          <div className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.slice(0, 3).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section id="catalogue" className="scroll-mt-20">
        <h2 className="font-display mb-5 text-3xl font-semibold">{filtering ? "Résultats" : "Tous les produits"}</h2>
        <Catalog products={products} categories={categories} initialQuery={sp.q ?? ""} initialCategory={sp.categorie ?? ""} />
      </section>
    </div>
  );
}
