import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatFcfa } from "@/lib/types";

/// Vignette produit — une par ligne, en bandeau large.
///
/// Le client voulait « un produit par ligne, le cadre bien gros et
/// présentable ». Une carte pleine largeur posée verticalement laisserait
/// un vide énorme à droite sur un écran large : elle est donc horizontale
/// dès `sm` (image à gauche, infos à droite) et empilée en dessous. Le
/// produit occupe toute la ligne sans jamais paraître étiré.
///
/// `compact` conserve l'ancien format en grille pour les endroits où la
/// densité prime (carrousels, listes secondaires).
export function ProductCard({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  const cover = product.product_images?.[0]?.url;
  const hasDiscount =
    product.compare_at_price != null && product.compare_at_price > product.price;
  const discount = hasDiscount
    ? 100 - Math.floor((product.price * 100) / product.compare_at_price!)
    : 0;

  if (compact) {
    return (
      <Link href={`/play/product/${product.id}`} className="press group block">
        <div className="relative mb-3 aspect-square overflow-hidden rounded-sm bg-surface-2">
          <Cover cover={cover} title={product.title} />
          {hasDiscount && <DiscountBadge value={discount} />}
        </div>
        <p className="line-clamp-2 text-base font-medium text-foreground">
          {product.title}
        </p>
        <p className="mt-1 text-base font-semibold">{formatFcfa(product.price)}</p>
      </Link>
    );
  }

  return (
    <Link
      href={`/play/product/${product.id}`}
      className="press group block overflow-hidden rounded-sm border border-border bg-surface transition-colors hover:bg-surface-2"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Visuel — carré sur mobile, colonne fixe généreuse au-delà. */}
        <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-surface-2 sm:aspect-auto sm:h-64 sm:w-64 lg:h-72 lg:w-72">
          <Cover cover={cover} title={product.title} />
          {hasDiscount && <DiscountBadge value={discount} />}
        </div>

        {/* Informations */}
        <div className="flex flex-1 flex-col justify-center gap-3 p-5 sm:p-8">
          <h3 className="line-clamp-2 font-display text-xl font-extrabold leading-tight tracking-tight lg:text-2xl">
            {product.title}
          </h3>

          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-extrabold lg:text-3xl">
              {formatFcfa(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-base text-muted-foreground line-through">
                {formatFcfa(product.compare_at_price!)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-muted-foreground">
            {product.shops?.name && <span>{product.shops.name}</span>}
            {product.city && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {product.city}
              </span>
            )}
          </div>

          <span className="mt-1 inline-flex items-center gap-2 text-base font-medium text-foreground">
            Voir le produit
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function Cover({ cover, title }: { cover?: string; title: string }) {
  if (!cover) {
    return (
      <div className="flex h-full w-full items-center justify-center text-base text-muted-foreground">
        Pas d&apos;image
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cover}
      alt={title}
      loading="lazy"
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
    />
  );
}

function DiscountBadge({ value }: { value: number }) {
  return (
    <span className="absolute left-3 top-3 rounded-sm bg-foreground px-2.5 py-1 text-sm font-bold text-background">
      −{value}%
    </span>
  );
}
