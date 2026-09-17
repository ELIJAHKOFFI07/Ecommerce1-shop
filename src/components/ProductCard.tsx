import Link from "next/link";
import { Money } from "./ui";
import { QuickAdd } from "./QuickAdd";

export type CardProduct = { id: string; slug: string; title: string; description?: string | null; price: unknown; images: string[]; categories?: { name: string }[] };

/// Cadre produit.
///
/// Les photos SuperLife sont des packagings détourés : on les montre
/// ENTIÈRES (object-contain) sur un fond doux, jamais recadrées. Le cadre
/// est une carte blanche à bord fin ; au survol elle se soulève à peine —
/// et surtout, l'action principale est un vrai bouton « Ajouter » au tap,
/// pas un geste caché derrière un survol (ui-ux-pro-max : hover-vs-tap).
export function ProductCard({ product }: { product: CardProduct }) {
  const cover = product.images[0];
  return (
    <article className="rise group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(12,10,9,0.25)]">
      <Link href={`/produit/${product.slug}`} className="block bg-[#f4f2ee] p-6" aria-label={product.title}>
        <div className="aspect-square">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" loading="lazy" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]" />
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">Pas d&apos;image</div>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        {product.categories?.[0] && <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{product.categories[0].name}</p>}
        <Link href={`/produit/${product.slug}`} className="font-display text-2xl font-semibold leading-tight hover:underline underline-offset-4">
          {product.title}
        </Link>
        {product.description && <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{product.description}</p>}
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <Money value={product.price as never} className="text-2xl" />
          <QuickAdd product={{ productId: product.id, slug: product.slug, title: product.title, image: cover, price: Number(product.price) }} />
        </div>
      </div>
    </article>
  );
}
