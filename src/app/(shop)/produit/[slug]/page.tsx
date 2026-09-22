import { notFound } from "next/navigation";
import { getProductBySlug, getCatalog } from "@/lib/catalog";
import { Money } from "@/components/ui";
import { ProductCard } from "@/components/ProductCard";
import { AddToCart } from "./AddToCart";
import { Gallery } from "./Gallery";
import { Tilt } from "@/components/Tilt";
import { Truck, BadgeCheck, Undo2 } from "lucide-react";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  const { products } = await getCatalog();
  const related = products.filter((x) => x.id !== p.id && x.categories.some((c) => p.categories.some((pc) => pc.slug === c.slug))).slice(0, 3);
  const promo = p.compareAtPrice && p.compareAtPrice > p.price ? Math.round(100 - (p.price / p.compareAtPrice) * 100) : 0;

  return (
    <div className="space-y-14">
      <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <Gallery images={p.images} title={p.title} />
        <div className="flex flex-col">
          {p.categories[0] && <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{p.categories[0].name}</p>}
          <h1 className="font-display mt-2 text-4xl font-semibold leading-tight lg:text-5xl">{p.title}</h1>
          {p.description && <p className="mt-5 whitespace-pre-line leading-relaxed text-foreground/85">{p.description}</p>}
          <Tilt className="mt-8 rounded-[16px] lg:sticky lg:top-24">
          <div className="socle vitrine relative overflow-hidden rounded-[16px] p-6 text-[#f5f0e8]">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#f5f0e8]/60">Prix</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <Money value={p.price} className="text-5xl leading-none text-[#e5b35d]" />
              {promo > 0 && (
                <>
                  <Money value={p.compareAtPrice!} className="text-lg text-[#f5f0e8]/50 line-through" />
                  <span className="rounded-full bg-[#e5b35d] px-2.5 py-1 text-xs font-black text-[#1c1917]">−{promo} %</span>
                </>
              )}
            </div>
            <p className="mt-2 text-sm text-[#f5f0e8]/70">{p.inStock ? "En stock — livraison à domicile, paiement à la réception ou par Mobile Money." : "Momentanément épuisé."}</p>
            <div className="mt-6">
              {p.inStock ? <AddToCart product={{ productId: p.id, slug: p.slug, title: p.title, image: p.images[0], price: p.price }} /> : null}
            </div>
          </div>
          </Tilt>
          <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
            <li className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5"><Truck className="h-4 w-4 shrink-0 text-accent" aria-hidden />Livraison à domicile</li>
            <li className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5"><BadgeCheck className="h-4 w-4 shrink-0 text-accent" aria-hidden />Paiement à la réception</li>
            <li className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5"><Undo2 className="h-4 w-4 shrink-0 text-accent" aria-hidden />Annulation avant expédition</li>
          </ul>
        </div>
      </div>
      {related.length > 0 && (
        <section>
          <h2 className="font-display mb-4 text-3xl font-semibold">Vous aimerez aussi</h2>
          <div className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <ProductCard key={r.id} product={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
