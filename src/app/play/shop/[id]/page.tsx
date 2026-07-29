"use client";

import { use, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import type { Product, Shop } from "@/lib/types";
import { ProductCard } from "@/components/play/ProductCard";
import { HeaderSkeleton, ProductGridSkeleton } from "@/components/Skeleton";

export default function ShopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: shopData } = await supabase
        .from("shops")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      setShop(shopData as Shop | null);
      const { data } = await supabase
        .from("products")
        .select("*, product_images(url, position), shops(*)")
        .eq("shop_id", id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      setProducts((data as Product[]) ?? []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="space-y-6"><HeaderSkeleton /><ProductGridSkeleton /></div>;
  if (!shop)
    return <p className="py-16 text-center text-muted">Boutique introuvable.</p>;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-2xl font-bold text-gold">
          {shop.name[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            {shop.name}
            {shop.identity_verified && (
              <ShieldCheck className="h-5 w-5 text-gold" />
            )}
          </h1>
          <p className="text-sm text-muted">{shop.city}</p>
          {shop.description && (
            <p className="mt-1 max-w-lg text-sm text-muted">{shop.description}</p>
          )}
        </div>
      </div>

      {products.length === 0 ? (
        <p className="py-12 text-center text-muted">Aucun produit.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
