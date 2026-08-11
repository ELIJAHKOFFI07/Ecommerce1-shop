import Link from "next/link";
import { BadgeCheck, MapPin, Store } from "lucide-react";
import type { Shop } from "@/lib/types";

/// Carte boutique — mise en avant des vendeurs sur la page d'accueil.
export function ShopCard({
  shop,
  productCount,
}: {
  shop: Shop;
  productCount?: number;
}) {
  return (
    <Link
      href={`/play/shop/${shop.id}`}
      className="lift press group flex h-full items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:border-accent/50"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/15 lg:h-14 lg:w-14">
        {shop.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shop.logo_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <Store className="h-5 w-5 text-accent" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-semibold transition-colors group-hover:text-accent">
            {shop.name}
          </span>
          {shop.identity_verified && (
            <BadgeCheck
              className="h-4 w-4 shrink-0 text-accent"
              aria-label="Boutique vérifiée"
            />
          )}
        </span>

        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
          {shop.city && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {shop.city}
            </span>
          )}
          {productCount != null && (
            <span>
              {productCount} produit{productCount > 1 ? "s" : ""}
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}
