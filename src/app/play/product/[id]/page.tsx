"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, ShieldCheck, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Product, Review } from "@/lib/types";
import { formatFcfa } from "@/lib/types";
import { useCart } from "@/lib/cart";
import { AuctionBlock } from "@/components/play/AuctionBlock";
import { PriceHistory } from "@/components/play/PriceHistory";
import { ProductActions } from "@/components/play/ProductActions";
import { ProductQna } from "@/components/play/ProductQna";

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { add } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("products")
        .select(
          "*, product_images(url, position), product_variants(*), shops(*)",
        )
        .eq("id", id)
        .maybeSingle();
      setProduct(data as Product | null);
      const { data: revs } = await supabase
        .from("reviews")
        .select("*, profiles!reviews_author_id_fkey(*)")
        .eq("product_id", id)
        .order("created_at", { ascending: false });
      setReviews((revs as Review[]) ?? []);
      setLoading(false);
      supabase.rpc("register_product_view", { p_product_id: id });
    })();
  }, [id]);

  if (loading) return <p className="py-16 text-center text-muted">Chargement…</p>;
  if (!product)
    return <p className="py-16 text-center text-muted">Produit introuvable.</p>;

  const images = product.product_images ?? [];
  const variant = product.product_variants?.find((v) => v.id === variantId);
  const price = variant?.price ?? product.price;
  const stock = variant?.stock ?? product.stock;
  const avg =
    reviews.length === 0
      ? 0
      : Math.round(
          (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10,
        ) / 10;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Galerie */}
      <div>
        <div className="aspect-square overflow-hidden rounded-2xl bg-surface-2">
          {images.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={images[imageIndex]?.url}
              alt={product.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">
              Pas d&apos;image
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setImageIndex(i)}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${
                  i === imageIndex ? "border-gold" : "border-border"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Infos */}
      <div>
        <h1 className="text-2xl font-bold">{product.title}</h1>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="text-2xl font-bold text-gold">
            {formatFcfa(price)}
          </span>
          {product.compare_at_price != null &&
            product.compare_at_price > price && (
              <span className="text-muted line-through">
                {formatFcfa(product.compare_at_price)}
              </span>
            )}
        </div>

        <div className="mt-2 flex items-center gap-3 text-sm text-muted">
          <span>
            {"★".repeat(Math.round(avg))}
            {"☆".repeat(5 - Math.round(avg))} ({reviews.length})
          </span>
          <span className={stock > 0 ? "text-green-400" : "text-red-400"}>
            {stock > 0 ? `Stock : ${stock}` : "Rupture"}
          </span>
          {product.city && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {product.city}
            </span>
          )}
        </div>

        {product.product_variants && product.product_variants.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold">Variantes</p>
            <div className="flex flex-wrap gap-2">
              {product.product_variants.map((v) => (
                <button
                  key={v.id}
                  disabled={v.stock <= 0}
                  onClick={() => setVariantId(variantId === v.id ? null : v.id)}
                  className={`rounded-full border px-3 py-1 text-sm disabled:opacity-40 ${
                    variantId === v.id
                      ? "border-gold text-gold"
                      : "border-border text-muted"
                  }`}
                >
                  {v.name}
                  {v.price != null ? ` · ${formatFcfa(v.price)}` : ""}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          disabled={
            stock <= 0 ||
            (Boolean(product.product_variants?.length) && !variantId)
          }
          onClick={() => {
            add(product, variantId);
            setAdded(true);
            setTimeout(() => setAdded(false), 1500);
          }}
          className="mt-6 w-full rounded-full bg-gold py-3 font-semibold text-black transition-transform hover:scale-[1.02] disabled:opacity-40"
        >
          {added ? "Ajouté ✓" : "Ajouter au panier"}
        </button>

        <ProductActions product={product} />
        <AuctionBlock product={product} />
        <PriceHistory productId={product.id} />

        {product.description && (
          <div className="mt-6">
            <h2 className="mb-2 font-semibold">Description</h2>
            <p className="whitespace-pre-line text-muted">{product.description}</p>
          </div>
        )}

        {product.shops && (
          <Link
            href={`/play/shop/${product.shop_id}`}
            className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-surface p-4 hover:border-gold/50"
          >
            <Store className="h-5 w-5 text-gold" />
            <div>
              <p className="flex items-center gap-1 font-medium">
                {product.shops.name}
                {product.shops.identity_verified && (
                  <ShieldCheck className="h-4 w-4 text-gold" />
                )}
              </p>
              <p className="text-xs text-muted">{product.shops.city}</p>
            </div>
          </Link>
        )}

        {reviews.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 font-semibold">Avis ({reviews.length})</h2>
            <div className="space-y-3">
              {reviews.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-border bg-surface p-3"
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">
                      {r.profiles?.full_name ?? r.profiles?.username ?? "Client"}
                    </span>
                    <span className="text-gold">
                      {"★".repeat(r.rating)}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="mt-1 text-sm text-muted">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <ProductQna productId={product.id} sellerId={product.seller_id} />
      </div>
    </div>
  );
}
