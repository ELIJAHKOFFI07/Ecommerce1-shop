"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import type { Product, Wishlist } from "@/lib/types";
import { ProductCard } from "@/components/play/ProductCard";
import { HeaderSkeleton, ProductGridSkeleton } from "@/components/Skeleton";

export default function WishlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: listData } = await supabase
        .from("wishlists")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      setWishlist(listData as Wishlist | null);
      const { data } = await supabase
        .from("wishlist_items")
        .select(
          "products(*, product_images(url, position), product_variants(*), shops(*))",
        )
        .eq("wishlist_id", id);
      // Supabase infère `products` comme un tableau sur les jointures ; ici la
      // FK garantit un seul produit par ligne.
      const rows = (data ?? []) as unknown as { products: Product | null }[];
      setProducts(rows.map((r) => r.products).filter((p): p is Product => p != null));
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="space-y-6"><HeaderSkeleton /><ProductGridSkeleton /></div>;

  return (
    <div>
      <Link
        href="/play/wishlists"
        className="card-hard-sm mb-4 inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 font-display text-xs font-bold text-foreground transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-surface-2 hover:shadow-none"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.5} /> Mes listes
      </Link>
      <h1 className="font-display text-2xl font-extrabold tracking-tight lg:text-3xl">
        {wishlist?.name ?? "Liste"}
      </h1>

      {products.length === 0 ? (
        <p className="py-16 text-center font-semibold text-foreground/60">
          Liste vide. Ajoutez des produits depuis leur fiche.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
