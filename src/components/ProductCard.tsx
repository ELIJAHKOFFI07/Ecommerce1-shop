import Link from "next/link";
import { Money } from "./ui";

/// Vignette produit : image, nom, prix. Rien d'autre — le client va droit
/// au but. Le prix est l'élément le plus visible après l'image.
export function ProductCard({ product }: { product: { slug: string; title: string; price: unknown; images: string[]; categories?: { name: string }[] } }) {
  const cover = product.images[0];
  return (
    <Link href={`/produit/${product.slug}`} className="press group block rise">
      <div className="aspect-square overflow-hidden rounded-lg bg-muted">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={product.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">Pas d&apos;image</div>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 font-medium leading-snug">{product.title}</p>
          {product.categories?.[0] && <p className="mt-0.5 text-sm text-muted-foreground">{product.categories[0].name}</p>}
        </div>
        <Money value={product.price as never} className="shrink-0 text-xl" />
      </div>
    </Link>
  );
}
