import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatFcfa } from "@/lib/types";

/// Vignette produit.
///
/// Pas de cadre par défaut : l'image carrée posée sur `surface-2` fait office
/// de carte, le texte vit dessous sur le fond de page. C'est la grammaire des
/// deux projets de référence — une bordure autour de chaque vignette, répétée
/// vingt fois sur une grille, alourdit la page sans rien apporter puisque
/// l'image délimite déjà la zone cliquable.
///
/// `hard` enveloppe la vignette dans un cadre à filet (`border`) pour les
/// grilles où chaque carte doit porter un cadre net — la page de recherche.
///
/// `compact` réduit le padding et les textes : pour les carrousels où l'on
/// veut des cartes denses, ex. la page d'accueil.
export function ProductCard({
  product,
  hard = false,
  compact = false,
}: {
  product: Product;
  hard?: boolean;
  compact?: boolean;
}) {
  const cover = product.product_images?.[0]?.url;
  const hasDiscount =
    product.compare_at_price != null && product.compare_at_price > product.price;
  const discount = hasDiscount
    ? 100 - Math.floor((product.price * 100) / product.compare_at_price!)
    : 0;

  const frame = compact
    ? "rounded-sm bg-surface p-2"
    : hard
      ? "rounded-sm bg-surface p-3"
      : "";

  return (
    <Link
      href={`/play/product/${product.id}`}
      className={`press group block ${frame}`}
    >
      <div
        className={`relative aspect-square overflow-hidden rounded-sm bg-surface-2 ${
          compact ? "mb-2" : "mb-3"
        }`}
      >
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

      <div className={frame ? "px-1 pb-1" : undefined}>
        <p
          className={`line-clamp-2 font-medium text-foreground ${
            compact ? "text-[13px]" : "text-sm lg:text-base"
          }`}
        >
          {product.title}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span
            className={`font-semibold text-foreground ${
              compact ? "text-[13px]" : "text-sm lg:text-base"
            }`}
          >
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
      </div>
    </Link>
  );
}
