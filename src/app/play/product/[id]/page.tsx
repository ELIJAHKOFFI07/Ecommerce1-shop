"use client";

import { use, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlignLeft,
  Check,
  ChevronRight,
  Eye,
  Flame,
  Heart,
  MapPin,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
} from "lucide-react";
import { createClient } from "@/lib/backend/client";
import type { Product, Review } from "@/lib/types";
import { formatFcfa } from "@/lib/types";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { AuctionBlock } from "@/components/play/AuctionBlock";
import { PriceHistory } from "@/components/play/PriceHistory";
import { ProductActions } from "@/components/play/ProductActions";
import { ProductQna } from "@/components/play/ProductQna";
import { HeaderSkeleton, ProductGridSkeleton } from "@/components/Skeleton";

/// Bouton principal : aplat orange (bg-primary) avec retour tactile `press`
/// (léger scale au clic). Pas de bordure ni ombre — cohérent avec le reste.
const BTN_PRIMARY =
  " press inline-flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-5 py-3 font-display text-sm font-bold text-primary-foreground transition-all  disabled:cursor-not-allowed disabled:opacity-50";

/// Boutons secondaires : même grammaire, aplat neutre (paper / ink / vert).
const BTN_BASE =
  " press inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 font-display text-sm font-bold transition-all ";
const BTN_INK = `${BTN_BASE} bg-foreground text-background`;


const CONDITION: Record<Product["condition"], { label: string; cls: string }> = {
  neuf: { label: "Neuf", cls: "bg-secondary text-secondary-foreground" },
  occasion: { label: "Occasion", cls: "bg-sun text-foreground" },
  reconditionne: { label: "Reconditionné", cls: "bg-primary text-primary-foreground" },
};

/// Puce / pastille au trait encre : le badge de base de la fiche produit.
function Pill({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
 className={`inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1 text-xs font-bold ${className}`}
    >
      {children}
    </span>
  );
}

/// Titre de rubrique avec pastille d'icône (grammaire des cartes de vitrine).
function SectionTitle({
  icon,
  children,
  className = "",
}: {
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
 className={`flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight ${className}`}
    >
 <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm border border-border bg-sun text-foreground">
        {icon}
      </span>
      {children}
    </h2>
  );
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { add } = useCart();
  const { profile } = useSession();
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

 if (loading) return <div className="space-y-6"><HeaderSkeleton /><ProductGridSkeleton /></div>;
  if (!product)
    return (
 <div className="mx-auto mt-10 max-w-md rounded-sm bg-surface p-8 text-center">
 <p className="font-display text-lg font-extrabold">Produit introuvable</p>
 <p className="mt-1 text-sm text-muted">
          Il a peut-être été supprimé, ou l&apos;adresse est incorrecte.
        </p>
 <Link href="/play/search" className={`${BTN_INK} mt-5 w-full`}>
          Retour au catalogue
        </Link>
      </div>
    );

  const images = product.product_images ?? [];
  const variant = product.product_variants?.find((v) => v.id === variantId);
  const price = variant?.price ?? product.price;
  const stock = variant?.stock ?? product.stock;
  const isMine = profile != null && profile.id === product.seller_id;
  const avg =
    reviews.length === 0
      ? 0
      : Math.round(
          (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10,
        ) / 10;
  const hasDiscount =
    product.compare_at_price != null && product.compare_at_price > price;
  const discount = hasDiscount
    ? 100 - Math.floor((price * 100) / product.compare_at_price!)
    : 0;
  const stockInfo =
    stock <= 0
      ? { label: "Rupture de stock", cls: "bg-destructive text-destructive-foreground" }
      : stock <= 5
        ? { label: `Plus que ${stock} en stock`, cls: "bg-sun text-foreground" }
        : { label: "En stock", cls: "bg-secondary text-secondary-foreground" };

  return (
 <div className="space-y-8">
      {/* Fil d'Ariane : repère simple, le header de page est déjà au-dessus. */}
      <nav
        aria-label="Fil d'Ariane"
 className="flex flex-wrap items-center gap-1.5 text-sm text-muted"
      >
 <Link href="/play" className="font-medium text-foreground underline-grow">
          Boutique
        </Link>
 <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href="/play/search"
 className="font-medium text-foreground underline-grow"
        >
          Catalogue
        </Link>
 <ChevronRight className="h-3.5 w-3.5" />
 <span className="max-w-[14rem] truncate font-medium text-foreground sm:max-w-xs">
          {product.title}
        </span>
      </nav>

 <div className="grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-start">
        {/* ---------------------------------------------------------------- */}
        {/* Galerie : cadre néo-brutal, badges superposés, pastilles de choix */}
        {/* ---------------------------------------------------------------- */}
 <div className="flex gap-3">
          {images.length > 1 && (
 <div className="flex shrink-0 flex-col gap-2 overflow-y-auto">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setImageIndex(i)}
                  aria-label={`Image ${i + 1} sur ${images.length}`}
                  aria-current={i === imageIndex}
 className={`press h-16 w-16 shrink-0 overflow-hidden rounded-sm border transition-all ${
                    i === imageIndex
                      ? "border-accent"
                      : "border-transparent hover:border-border"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
 <div className="min-w-0 flex-1 rounded-sm bg-surface p-2">
 <div className="relative aspect-square overflow-hidden rounded-sm bg-surface-2">
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

 <div className="absolute left-3 top-3 flex flex-col items-start gap-2">
 <Pill className={CONDITION[product.condition].cls}>
                  {CONDITION[product.condition].label}
                </Pill>
                {hasDiscount && discount > 0 && (
 <Pill className="bg-primary text-primary-foreground">
                    −{discount}%
                  </Pill>
                )}
                {product.is_flash && (
 <Pill className="bg-sun text-foreground">
 <Flame className="h-3 w-3" /> Flash
                  </Pill>
                )}
              </div>

              {images.length > 1 && (
 <span className="absolute bottom-3 right-3 rounded-sm border border-border bg-foreground px-3 py-1 text-xs font-bold text-background">
                  {imageIndex + 1}/{images.length}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Colonne infos : prix en héro orange, blocs néo-brutals empilés    */}
        {/* ---------------------------------------------------------------- */}
 <div className="min-w-0 space-y-5">
 <div className="flex items-start justify-between gap-3">
 <h1 className="min-w-0 flex-1 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              {product.title}
            </h1>
            {product.shops && (
              <Link
                href={`/play/shop/${product.shop_id}`}
 className="press mt-1 flex shrink-0 items-center gap-2 rounded-sm bg-surface px-3 py-2 transition-all"
              >
                {product.shops.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.shops.logo_url}
                    alt=""
 className="h-8 w-8 shrink-0 rounded-sm border border-border object-cover"
                  />
                ) : (
 <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm border border-border bg-primary text-primary-foreground">
 <Store className="h-3.5 w-3.5" />
                  </span>
                )}
 <span className="flex flex-col">
 <span className="flex items-center gap-1 font-display text-xs font-bold">
                    {product.shops.name}
                    {product.shops.identity_verified && (
 <ShieldCheck className="h-3 w-3 shrink-0 text-secondary" />
                    )}
                  </span>
 <span className="text-[10px] leading-tight text-muted">
                    {product.shops.city}
                  </span>
                </span>
              </Link>
            )}
          </div>

 <div className="flex flex-wrap items-center gap-2">
            {product.city && (
 <Pill className="bg-surface-2 text-foreground">
 <MapPin className="h-3 w-3" /> {product.city}
              </Pill>
            )}
 <Pill className={stockInfo.cls}>{stockInfo.label}</Pill>
 <Pill className="bg-surface-2 text-foreground">
 <Eye className="h-3 w-3" /> {product.views_count}
            </Pill>
            {product.favorites_count > 0 && (
 <Pill className="bg-surface-2 text-foreground">
 <Heart className="h-3 w-3" /> {product.favorites_count}
              </Pill>
            )}
            {reviews.length > 0 ? (
 <a href="#avis" className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-sun px-3 py-1 font-display text-xs font-bold text-foreground">
 <Star className="h-3 w-3 fill-current" /> {avg.toFixed(1)} · {reviews.length} avis
              </a>
            ) : (
 <span className="inline-flex items-center rounded-sm border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
                Aucun avis
              </span>
            )}
          </div>

          {/* Prix + CTA sur la même ligne : prix à gauche, bouton à droite. */}
 <div className="flex flex-wrap items-center gap-3">
 <div className="flex-1 min-w-0">
 <div className="flex flex-wrap items-baseline gap-3">
 <span className="font-display text-3xl font-extrabold sm:text-4xl">
                  {formatFcfa(price)}
                </span>
                {hasDiscount && (
 <span className="text-sm text-muted line-through">
                    {formatFcfa(product.compare_at_price!)}
                  </span>
                )}
              </div>
              {hasDiscount && (
 <span className="mt-1 inline-block rounded-sm bg-secondary/20 px-3 py-1 text-sm font-bold text-secondary">
                  Économisez {formatFcfa(product.compare_at_price! - price)}
                </span>
              )}
            </div>
            {!isMine && (
 <div className="flex gap-2">
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
 className="press inline-flex items-center gap-2 rounded-sm bg-primary px-5 py-3 font-display text-sm font-bold text-primary-foreground transition-all disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {added ? (
                    <>
 <Check className="h-4 w-4" /> Ajouté
                    </>
                  ) : (
                    <>
 <ShoppingCart className="h-4 w-4" /> Ajouter au panier
                    </>
                  )}
                </button>
                <button
                  aria-label="Ajouter aux favoris"
 className="press grid h-12 w-12 shrink-0 place-items-center rounded-sm bg-surface transition-all"
                >
 <Heart className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* Description : juste sous le prix. */}
          {product.description && (
            <div>
 <SectionTitle icon={<AlignLeft className="h-3.5 w-3.5" />}>
                Description
              </SectionTitle>
 <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">
                {product.description}
              </p>
            </div>
          )}

          {isMine && (
 <div className="rounded-sm bg-surface-2 p-4 text-center">
 <p className="font-display text-base font-bold">C&apos;est votre produit.</p>
 <p className="mt-1 text-sm text-muted">
                Vous ne pouvez pas commander votre propre marchandise.
              </p>
 <Link href="/play/sell" className={`${BTN_INK} mt-4`}>
                Gérer mes produits
              </Link>
            </div>
          )}

          {/* Variantes : pastilles sélectionnables, l'état se "plaque". */}
          {product.product_variants && product.product_variants.length > 0 && (
            <div>
 <div className="mb-2 flex items-center justify-between">
 <p className="font-display text-sm font-bold">Variantes</p>
                {variant && (
 <p className="text-xs text-muted">
 Sélectionnée : <span className="font-medium text-foreground">{variant.name}</span>
                  </p>
                )}
              </div>
 <div className="flex flex-wrap gap-2">
                {product.product_variants.map((v) => (
                  <button
                    key={v.id}
                    disabled={v.stock <= 0}
                    onClick={() => setVariantId(variantId === v.id ? null : v.id)}
                    aria-pressed={variantId === v.id}
 className={` press rounded-sm px-3.5 py-1.5 text-sm font-display font-bold transition-all disabled:opacity-40 ${
                      variantId === v.id
                        ? "bg-foreground text-background"
                        : "bg-surface text-muted  hover:text-foreground"
                    }`}
                  >
                    {v.name}
                    {v.price != null ? ` · ${formatFcfa(v.price)}` : ""}
                  </button>
                ))}
              </div>
            </div>
          )}



          <ProductActions product={product} />
          <AuctionBlock product={product} />
          <PriceHistory productId={product.id} />
          <ProductQna productId={product.id} sellerId={product.seller_id} />

        </div>
      </div>

      {/* Avis : pleine largeur sous le produit, vue tableau + note globale. */}
      {reviews.length > 0 && (
 <section id="avis" className="scroll-mt-24">
 <div className="flex flex-wrap items-end justify-between gap-3">
 <SectionTitle icon={<Star className="h-3.5 w-3.5 fill-current" />}>
              Avis clients
            </SectionTitle>
 <div className="flex items-center gap-2 rounded-sm border border-border bg-surface px-3 py-1.5">
 <span className="font-display text-base font-extrabold">
                {avg.toFixed(1)}
              </span>
 <span aria-hidden className="text-sm text-accent">
                {"★".repeat(Math.round(avg))}
                {"☆".repeat(5 - Math.round(avg))}
              </span>
            </div>
          </div>

 <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.slice(0, 5).map((r) => (
              <article
                key={r.id}
 className="flex flex-col gap-2 rounded-sm bg-surface p-3.5"
              >
 <div className="flex items-center justify-between gap-2">
 <span className="truncate font-display text-sm font-bold">
                    {r.profiles?.full_name ?? r.profiles?.username ?? "Client"}
                  </span>
 <span aria-label={`${r.rating} étoiles sur 5`} className="text-sm text-accent">
                    {"★".repeat(r.rating)}
                  </span>
                </div>
                {r.comment && (
 <p className="text-sm leading-relaxed text-muted">{r.comment}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}


    </div>
  );
}