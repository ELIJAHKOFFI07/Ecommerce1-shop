import Link from "next/link";
import { Money } from "./ui";
import { QuickAdd } from "./QuickAdd";

export type CardProduct = { id: string; slug: string; title: string; description?: string | null; price: number; compareAtPrice?: number | null; inStock?: boolean; images: string[]; categories?: { name: string }[] };

/// Cadre produit « vitrine ».
///
/// Deux étages, comme un présentoir de boutique :
///  - la SCÈNE : fond chaud en dégradé radial avec un grain léger, le
///    produit détouré posé dessus avec une ombre portée réaliste et une
///    ombre au sol elliptique. Au survol le produit se soulève de 6 px et
///    l'ombre au sol s'élargit — la carte réagit comme un objet, pas
///    comme un rectangle ;
///  - le SOCLE : bande encre en bas, filet or, nom en Cormorant crème,
///    prix en or bien gros, bouton « Ajouter » or sur encre.
/// Ombres en trois couches (contact, diffusion, ambiance) : c'est ce qui
/// donne la profondeur sans effet criard (ui-ux-pro-max : realistic
/// multi-layer shadows, depth, grain, tactile 300 ms).
export function ProductCard({ product }: { product: CardProduct }) {
  const cover = product.images[0];
  return (
    <article className="vitrine rise group flex flex-col overflow-hidden rounded-[14px] bg-card">
      <Link href={`/produit/${product.slug}`} aria-label={product.title} className="scene relative block px-8 pb-6 pt-8">
        {product.categories?.[0] && <span className="absolute left-4 top-4 rounded-full border border-black/10 bg-white/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-700 backdrop-blur">{product.categories[0].name}</span>}
        {product.compareAtPrice && product.compareAtPrice > product.price && (
          <span className="absolute right-4 top-4 rounded-full bg-[#e5b35d] px-2.5 py-1 text-[11px] font-black text-[#1c1917]">−{Math.round(100 - (product.price / product.compareAtPrice) * 100)} %</span>
        )}
        {product.inStock === false && <span className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-stone-800/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">Rupture</span>}
        <div className="relative aspect-square">
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
        <Link href={`/produit/${product.slug}`} className="font-display text-[26px] font-semibold leading-none tracking-tight hover:underline underline-offset-4">
          {product.title}
        </Link>
        {product.description && <p className="line-clamp-2 text-[13.5px] leading-relaxed text-[#f5f0e8]/70">{product.description}</p>}
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div>
            {product.compareAtPrice && product.compareAtPrice > product.price && <Money value={product.compareAtPrice} className="block text-sm text-[#f5f0e8]/50 line-through" />}
            <Money value={product.price} className="text-[28px] leading-none text-[#e5b35d]" />
          </div>
          <QuickAdd product={{ productId: product.id, slug: product.slug, title: product.title, image: cover, price: product.price }} tone="gold" disabled={product.inStock === false} />
        </div>
      </div>
    </article>
  );
}
