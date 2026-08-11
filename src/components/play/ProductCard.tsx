import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatFcfa } from "@/lib/types";

/// Vignette produit.
///
/// Pas de cadre : l'image carrée posée sur `surface-2` fait office de carte,
/// le texte vit dessous sur le fond de page. C'est la grammaire des deux
/// projets de référence — une bordure autour de chaque vignette, répétée
/// vingt fois sur une grille, alourdit la page sans rien apporter puisque
/// l'image délimite déjà la zone cliquable.
export function ProductCard({ product }: { product: Product }) {
  const cover = product.product_images?.[0]?.url;
  const hasDiscount =
    product.compare_at_price != null && product.compare_at_price > product.price;
  const discount = hasDiscount
    ? 100 - Math.floor((product.price * 100) / product.compare_at_price!)
    : 0;

  return (
    <Link href={`/play/product/${product.id}`} className="press group block">
      <div className="relative mb-3 aspect-square overflow-hidden rounded-2xl bg-surface-2">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Pas d&apos;image
          </div>
        )}
        {hasDiscount && (
          <span className="absolute left-3 top-3 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-medium text-background">
            −{discount}%
          </span>
        )}
      </div>

      <p className="line-clamp-2 text-sm font-medium text-foreground lg:text-base">
        {product.title}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-sm font-semibold text-foreground lg:text-base">
          {formatFcfa(product.price)}
        </span>
        {hasDiscount && (
          <span className="text-xs text-muted line-through">
            {formatFcfa(product.compare_at_price!)}
          </span>
        )}
      </div>
      {product.city && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted">
          <MapPin className="h-3 w-3" /> {product.city}
        </p>
      )}
    </Link>
  );
}
