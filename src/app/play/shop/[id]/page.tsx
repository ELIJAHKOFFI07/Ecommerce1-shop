"use client";

import { use, useEffect, useState } from "react";
import { MapPin, ShieldCheck } from "lucide-react";
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
 <div className="relative mb-8 overflow-hidden rounded-sm bg-surface">
 <div className="relative flex min-h-40 flex-col justify-end p-5 sm:p-6">
 <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-sun/30 blur-2xl" />
 <div className="relative flex flex-wrap items-end gap-4">
 <div className="-rotate-2 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-surface-2 text-2xl font-bold text-foreground">
              {shop.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
 <img src={shop.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                shop.name[0]?.toUpperCase()
              )}
            </div>
 <div className="min-w-0 flex-1">
 <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
                {shop.name}
                {shop.identity_verified && (
                  <span
 className="inline-flex items-center gap-1 rounded-sm bg-vert-soft px-2 py-0.5 text-[11px] font-medium text-vert-deep"
                    title="Boutique vérifiée"
                  >
 <ShieldCheck className="h-3.5 w-3.5" /> Vérifiée
                  </span>
                )}
              </h1>
              {shop.city && (
 <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
 <MapPin className="h-3.5 w-3.5" /> {shop.city}
                </p>
              )}
            </div>
          </div>
          {shop.description && (
 <p className="relative mt-4 max-w-xl text-sm text-muted">
              {shop.description}
            </p>
          )}
        </div>
      </div>

      {products.length === 0 ? (
 <p className="py-12 text-center text-muted">Aucun produit.</p>
      ) : (
 <div className="flex flex-col gap-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
