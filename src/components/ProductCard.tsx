import Link from "next/link";
import { Money } from "./ui";
import { QuickAdd } from "./QuickAdd";
import { Tilt } from "./Tilt";

export type CardProduct = { id: string; slug: string; title: string; description?: string | null; price: number; compareAtPrice?: number | null; inStock?: boolean; images: string[]; categories?: { name: string }[] };

/// Cadre produit « vitrine ».
///
/// Deux étages, comme un présentoir de boutique :
///  - la SCÈNE : fond chaud en dégradé radial avec un grain léger, le
///    produit détouré posé dessus avec une ombre portée réaliste et une
///    ombre au sol. La carte entière s'incline vers le pointeur (relief
///    3D, reflet or) et le produit se détache du plan (translateZ) ;
///  - le SOCLE : bande encre, filet or, nom en Cormorant crème, prix en
///    or bien gros, bouton « Ajouter » or sur encre.
export function ProductCard({ product }: { product: CardProduct }) {
  const cover = product.images[0];
  const promo = product.compareAtPrice && product.compareAtPrice > product.price ? Math.round(100 - (product.price / product.compareAtPrice) * 100) : 0;
  return (
    <Tilt className="rounded-[16px]">
      <article className="vitrine group flex h-full flex-col overflow-hidden rounded-[16px] bg-card">
        <Link href={`/produit/${product.slug}`} aria-label={product.title} className="scene relative block px-8 pb-6 pt-8">
          {product.categories?.[0] && <span className="absolute left-4 top-4 z-20 rounded-full border border-black/10 bg-white/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-700 backdrop-blur">{product.categories[0].name}</span>}
          {promo > 0 && <span className="absolute right-4 top-4 z-20 rounded-full bg-[#e5b35d] px-2.5 py-1 text-[11px] font-black text-[#1c1917] shadow-md">−{promo} %</span>}
          {product.inStock === false && <span className="absolute inset-x-0 bottom-3 z-20 mx-auto w-fit rounded-full bg-stone-800/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">Rupture</span>}
          <div className="lift relative aspect-square">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" loading="lazy" className="product-img relative z-10 h-full w-full object-contain" />
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">Pas d&apos;image</div>
            )}
            <span aria-hidden className="floor-shadow" />
          </div>
        </Link>

        <div className="socle relative flex flex-1 flex-col gap-2 px-5 pb-5 pt-5 text-[#f5f0e8]">
          <Link href={`/produit/${product.slug}`} className="font-display text-[26px] font-semibold leading-none tracking-tight underline-offset-4 hover:underline">
            {product.title}
          </Link>
          {product.description && <p className="line-clamp-2 text-[13.5px] leading-relaxed text-[#f5f0e8]/70">{product.description}</p>}
          <div className="mt-auto flex items-end justify-between gap-3 pt-3">
            <div>
              {promo > 0 && <Money value={product.compareAtPrice!} className="block text-sm text-[#f5f0e8]/50 line-through" />}
              <Money value={product.price} className="text-[28px] leading-none text-[#e5b35d]" />
            </div>
            <QuickAdd product={{ productId: product.id, slug: product.slug, title: product.title, image: cover, price: product.price }} tone="gold" disabled={product.inStock === false} />
          </div>
        </div>
      </article>
    </Tilt>
  );
}
