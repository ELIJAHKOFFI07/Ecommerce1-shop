import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatFcfa } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const cover = product.product_images?.[0]?.url;
  const hasDiscount =
    product.compare_at_price != null && product.compare_at_price > product.price;
  const discount = hasDiscount
    ? 100 - Math.floor((product.price * 100) / product.compare_at_price!)
    : 0;

  return (
    <Link
      href={`/play/product/${product.id}`}
      className="lift press group block overflow-hidden rounded-xl border border-border bg-surface hover:border-gold/50"
    >
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            Pas d&apos;image
          </div>
        )}
        {/* Voile qui apparaît au survol : renforce l'affordance de clic sur
            une carte dont toute la surface est cliquable. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 p-2 text-center text-[11px] font-medium text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
        >
          Voir le produit
        </span>
        {hasDiscount && (
          <span className="absolute left-2 top-2 rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            -{discount}%
          </span>
        )}
      </div>
      <div className="p-3 lg:p-4">
        <p className="line-clamp-2 text-sm font-medium transition-colors group-hover:text-gold lg:text-base">
          {product.title}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-bold text-gold lg:text-lg">{formatFcfa(product.price)}</span>
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
