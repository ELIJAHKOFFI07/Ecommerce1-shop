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
      className="group overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-gold/50"
    >
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            Pas d&apos;image
          </div>
        )}
        {hasDiscount && (
          <span className="absolute left-2 top-2 rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            -{discount}%
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-medium">{product.title}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-bold text-gold">{formatFcfa(product.price)}</span>
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
