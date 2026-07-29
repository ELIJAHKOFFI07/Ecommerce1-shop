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
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Mes listes
      </Link>
      <h1 className="text-2xl font-bold">{wishlist?.name ?? "Liste"}</h1>

      {products.length === 0 ? (
        <p className="py-16 text-center text-muted">
          Liste vide. Ajoutez des produits depuis leur fiche.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
