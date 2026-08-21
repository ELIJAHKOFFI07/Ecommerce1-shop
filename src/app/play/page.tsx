"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Compass,
  Flame,
  Gavel,
  Gift,
  MapPin,
  Package,
  Sparkles,
  Store,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { useSession } from "@/lib/session";
import {
  formatFcfa,
  type Auction,
  type Category,
  type Product,
  type Shop,
} from "@/lib/types";
import { ProductCard } from "@/components/play/ProductCard";
import { CategoryCard } from "@/components/play/CategoryCard";
import { StoriesBar } from "@/components/play/StoriesBar";
import { PromoCarousel } from "@/components/play/PromoCarousel";
import { ScrollCarousel } from "@/components/marketing/ScrollCarousel";
import { ProductGridSkeleton } from "@/components/Skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

/// Boutons partagés : primaire en CTA plein, secondaire en contour.
/// Pas d'ombre dure ni de translate au survol — feedback subtil uniquement.
const btnPrimary =
  "press rounded-sm inline-flex items-center gap-2 bg-primary px-5 py-2.5 font-display text-sm font-bold text-primary-foreground transition-all";
const btnSecondary =
  "rounded-sm border border-border bg-surface px-5 py-2.5 font-display text-sm font-bold text-foreground transition-all hover:bg-surface-2";

export default function PlayHome() {
  // La répartition entre rubriques est faite au chargement plutôt que
  // pendant le rendu : elle dépend de l'heure courante, valeur qui changerait
  // d'un rendu à l'autre et rendrait l'affichage instable.
  const [flash, setFlash] = useState<Product[]>([]);
  const [popular, setPopular] = useState<Product[]>([]);
  const [regular, setRegular] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasShop, setHasShop] = useState(false);
  const { canSell, profile } = useSession();

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [prodRes, catRes, shopRes, auctionRes] = await Promise.all([
        supabase
          .from("products")
          .select("*, product_images(url, position), shops(*)")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(32),
        supabase.from("categories").select("*").order("position"),
        // 10 boutiques : la grille à 5 colonnes en affiche 9, la dixième
        // case est occupée par la carte d'invitation à publier.
        supabase
          .from("shops")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("auctions")
          .select("*, products(*, product_images(url, position))")
          .eq("status", "active")
          .order("ends_at")
          .limit(4),
      ]);

      if (prodRes.error) setError(prodRes.error.message);
      const list = (prodRes.data as Product[]) ?? [];

      const now = Date.now();
      const isLive = (p: Product) =>
        p.is_flash &&
        (!p.flash_ends_at || new Date(p.flash_ends_at).getTime() > now);

      const rest = list.filter((p) => !isLive(p));
      setFlash(list.filter(isLive).slice(0, 6));
      // « Les plus aimés » se lit sur les favoris et non sur les vues : une
      // vue s'obtient par accident, un favori est un geste volontaire.
      setPopular(
        [...rest]
          .filter((p) => p.favorites_count > 0)
          .sort((a, b) => b.favorites_count - a.favorites_count)
          .slice(0, 6),
      );
      setRegular(rest);
      setCategories((catRes.data as Category[]) ?? []);
      setShops((shopRes.data as Shop[]) ?? []);
      setAuctions((auctionRes.data as Auction[]) ?? []);
      setLoading(false);
    })();
  }, []);

  // Le hero ne propose « Ouvrir ma boutique » qu'aux vendeurs qui n'en ont
  // pas encore ; sinon il renvoie vers la gestion de la boutique.
  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    (async () => {
      const { data } = await createClient()
        .from("shops")
        .select("id")
        .eq("owner_id", profile.id)
        .maybeSingle();
      if (!cancelled) setHasShop(data != null);
    })();
    // Réinitialise au changement de compte (ou à la déconnexion) pour ne pas
    // garder l'état de la session précédente.
    return () => {
      cancelled = true;
      setHasShop(false);
    };
  }, [profile]);

  const firstName = profile?.full_name?.split(" ")[0] ?? profile?.username;

  return (
 <div className="space-y-12 lg:space-y-20">
      {/* Groupe du haut : accroche, bande plein largeur puis raccourcis —
          espacements volontairement resserrés pour ne pas aérer l'entête. */}
 <div className="space-y-4 lg:space-y-5">
        {/* ------------------------------------------------------------ */}
        {/* Accroche personnalisée (compacte, au-dessus de la bande)      */}
        {/* ------------------------------------------------------------ */}
 <section className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
 <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
 <h1 className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight sm:text-2xl">
 <Sparkles className="h-6 w-6 text-primary" />
              {firstName ? `Bonjour, ${firstName}` : "Bienvenue"} ✦
            </h1>
            {profile && (
 <p className="rounded-sm inline-flex items-center gap-1.5 bg-surface px-3 py-1.5 text-xs font-bold">
 <Wallet className="h-3.5 w-3.5 text-primary" />
                {profile.loyalty_points} points de fidélité
              </p>
            )}
          </div>

 <div className="flex flex-wrap gap-2.5">
            {canSell && (
 <Link href="/play/sell" className={btnPrimary}>
 <Store className="h-4 w-4" />
                {hasShop ? "Gérer ma boutique" : "Ouvrir ma boutique"}
              </Link>
            )}
 <Link href="/play/search" className={btnSecondary}>
 <Compass className="h-4 w-4" />
              Parcourir le catalogue
            </Link>
          </div>
        </section>

        {/* ------------------------------------------------------------ */}
        {/* Bande promo pleine largeur (sort du conteneur via marges négatives) */}
        {/* ------------------------------------------------------------ */}
 <section className="-mx-4 md:-mx-6 lg:-mx-8">
          <PromoCarousel />
        </section>

        {/* ------------------------------------------------------------ */}
        {/* Raccourcis (sans titre, pastilles compactes sous la bande)    */}
        {/* ------------------------------------------------------------ */}
        <section>
 <div className="flex flex-wrap gap-3">
            <ShortcutCard
              href="/play/auctions"
              accent="var(--pillar-deal)"
 icon={<Gavel className="h-4 w-4" />}
              title="Enchères"
            />
            <ShortcutCard
              href="/play/spin"
              accent="var(--pillar-play)"
 icon={<Sparkles className="h-4 w-4" />}
              title="Roue de la chance"
            />
            <ShortcutCard
              href="/play/referral"
              accent="var(--pillar-gift)"
 icon={<Gift className="h-4 w-4" />}
              title="Parrainage"
            />
            {canSell ? (
              <ShortcutCard
                href="/play/wallet"
                accent="var(--pillar-sell)"
 icon={<Wallet className="h-4 w-4" />}
                title="Portefeuille"
              />
            ) : (
              <ShortcutCard
                href="/play/orders"
                accent="var(--pillar-buy)"
 icon={<Package className="h-4 w-4" />}
                title="Mes commandes"
              />
            )}
          </div>
        </section>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Histoires                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section>
        <StoriesBar />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Catégories                                                        */}
      {/* ---------------------------------------------------------------- */}
      {categories.length > 0 && (
        <section>
          <SectionTitle
            action={{ href: "/play/search", label: "Tout parcourir" }}
          >
            Catégories
          </SectionTitle>
 <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Ventes flash                                                      */}
      {/* ---------------------------------------------------------------- */}
      {flash.length > 0 && (
        <section>
          <SectionTitle
 icon={<Zap className="h-5 w-5 text-primary" />}
            action={{ href: "/play/search", label: "Tout voir" }}
          >
            Ventes flash
          </SectionTitle>
          <ProductGrid products={flash} hard />
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Enchères en cours                                                 */}
      {/* ---------------------------------------------------------------- */}
      {auctions.length > 0 && (
        <section>
          <SectionTitle
 icon={<Gavel className="h-5 w-5 text-primary" />}
            action={{ href: "/play/auctions", label: "Toutes les enchères" }}
          >
            Enchères en cours
          </SectionTitle>
          <RowCarousel
            itemClassName="basis-[85%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
            items={auctions.map((a) => (
              <AuctionTile key={a.id} auction={a} />
            ))}
          />
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Nouveautés                                                        */}
      {/* ---------------------------------------------------------------- */}
      <section>
        <SectionTitle
 icon={<Flame className="h-5 w-5 text-primary" />}
          subtitle={
            regular.length > 0
              ? `À partir de ${formatFcfa(
                  Math.min(...regular.map((p) => p.price)),
                )}`
              : undefined
          }
        >
          Nouveautés
        </SectionTitle>

        {error && (
 <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
            Connexion impossible : {error}. Vérifiez la configuration Supabase
            (.env.local).
          </p>
        )}

        {loading ? (
          <ProductGridSkeleton />
        ) : regular.length === 0 ? (
          <EmptyCatalogue canSell={canSell} hasShop={hasShop} />
        ) : (
          <RowCarousel
            itemClassName="basis-[75%] sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
            items={regular.map((p) => (
              <ProductCard key={p.id} product={p} hard compact />
            ))}
          />
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Les plus aimés                                                    */}
      {/* ---------------------------------------------------------------- */}
      {popular.length > 0 && (
        <section>
 <SectionTitle icon={<TrendingUp className="h-5 w-5 text-primary" />}>
            Les plus aimés
          </SectionTitle>
          <ProductGrid products={popular} hard />
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Boutiques                                                         */}
      {/* ---------------------------------------------------------------- */}
      {shops.length > 0 && (
        <section>
 <SectionTitle icon={<Store className="h-5 w-5 text-primary" />}>
            Boutiques à découvrir
          </SectionTitle>
 <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {shops.slice(0, 9).map((s) => (
              <ShopTile key={s.id} shop={s} />
            ))}
            <PublishShopCard canSell={canSell} hasShop={hasShop} />
          </div>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Éléments partagés                                                   */
/* ------------------------------------------------------------------ */

/// En-tête de rubrique : titre, sous-titre facultatif et lien d'action.
/// Uniformise l'espacement de toutes les sections de la page.
function SectionTitle({
  children,
  icon,
  subtitle,
  action,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  subtitle?: string;
  action?: { href: string; label: string };
}) {
  return (
 <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 lg:mb-8">
      <div>
 <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight lg:text-3xl">
          {icon}
          {children}
        </h2>
        {subtitle && (
 <p className="mt-1 text-sm text-muted lg:text-base">{subtitle}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
 className="rounded-sm press inline-flex items-center gap-1.5 bg-surface px-4 py-2 font-display text-xs font-bold transition-all hover:bg-surface-2"
        >
          {action.label}
 <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

/// Carrousel Embla « basique » : plusieurs cartes visibles par vue, flèches
/// latérales, alignement au début. Le geste tactile fonctionne de série.
function RowCarousel({
  items,
  itemClassName,
}: {
  items: React.ReactNode[];
  itemClassName: string;
}) {
  return (
 <Carousel opts={{ align:"start" }} className="group">
      <CarouselContent>
        {items.map((item, i) => (
 <CarouselItem key={i} className={itemClassName}>
            {item}
          </CarouselItem>
        ))}
      </CarouselContent>
 <CarouselPrevious className="left-3 border border-border bg-background text-foreground hover:bg-surface-2 hover:text-foreground" />
 <CarouselNext className="right-3 border border-border bg-background text-foreground hover:bg-surface-2 hover:text-foreground" />
    </Carousel>
  );
}

/// Grille produit unique : une seule définition des points de rupture pour
/// toute la page, plutôt que la même liste de classes répétée cinq fois.
/// `hard` enveloppe chaque vignette dans le cadre néo-brutal ( ).
function ProductGrid({
  products,
  hard = false,
}: {
  products: Product[];
  hard?: boolean;
}) {
  return (
    <>
      {/* Sur téléphone, une rubrique longue passe en carrousel : trente
          cartes en grille imposeraient un défilement interminable. */}
 <div className="sm:hidden">
        {products.length > 4 ? (
          <ScrollCarousel itemClassName="w-40">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} hard={hard} />
            ))}
          </ScrollCarousel>
        ) : (
 <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} hard={hard} />
            ))}
          </div>
        )}
      </div>

 <div className="hidden gap-x-5 gap-y-10 sm:gap-x-6 sm:grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} hard={hard} />
        ))}
      </div>
    </>
  );
}

/// Vignette d'enchère : photo, nombre d'offres et offre actuelle.
function AuctionTile({ auction }: { auction: Auction }) {
  const product = auction.products;
  const cover = product?.product_images?.[0]?.url;
  const current = auction.current_bid ?? auction.starting_price;

  return (
    <Link
      href={`/play/product/${auction.product_id}`}
 className="press rounded-sm group flex h-full flex-col overflow-hidden bg-surface transition-all"
    >
 <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            loading="lazy"
 className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
 <span className="flex h-full items-center justify-center text-muted">
            Pas d&apos;image
          </span>
        )}
 <span className="absolute left-2 top-2 rounded-md bg-foreground px-2 py-0.5 text-xs font-bold text-background">
          {auction.bids_count} offre{auction.bids_count > 1 ? "s" : ""}
        </span>
      </div>
 <div className="flex flex-1 flex-col p-3 lg:p-4">
 <p className="line-clamp-1 text-sm font-medium transition-colors group-hover:text-accent lg:text-base">
          {product?.title ?? "Produit"}
        </p>
 <p className="mt-auto pt-1 text-xs text-muted">Offre actuelle</p>
 <p className="font-display font-bold text-accent lg:text-lg">
          {formatFcfa(current)}
        </p>
      </div>
    </Link>
  );
}

/// Pastille de raccourci vers une rubrique (enchères, roue, parrainage…).
/// Compacte par construction : icône + libellé, sans description.
function ShortcutCard({
  href,
  accent,
  icon,
  title,
}: {
  href: string;
  accent: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Link
      href={href}
 className="press inline-flex items-center gap-1.5 rounded-sm bg-surface px-3 py-2 font-display text-xs font-bold transition-all sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
    >
      <span
 className="grid h-4 w-4 shrink-0 place-items-center sm:h-5 sm:w-5"
        style={{ color: accent }}
      >
        {icon}
      </span>
      {title}
    </Link>
  );
}

/// Vignette boutique verticale, compacte, pour la grille à 5 colonnes.
function ShopTile({ shop }: { shop: Shop }) {
  return (
    <Link
      href={`/play/shop/${shop.id}`}
 className="press flex h-full flex-col items-center gap-1.5 rounded-sm bg-surface p-3 text-center transition-all"
    >
 <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-surface-2">
        {shop.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shop.logo_url}
            alt=""
            loading="lazy"
 className="h-full w-full object-cover"
          />
        ) : (
 <Store className="h-5 w-5 text-muted" />
        )}
      </span>

 <span className="flex min-w-0 items-center justify-center gap-1">
 <span className="truncate font-display text-[13px] font-bold">
          {shop.name}
        </span>
        {shop.identity_verified && (
          <BadgeCheck
 className="h-3.5 w-3.5 shrink-0 text-accent"
            aria-label="Boutique vérifiée"
          />
        )}
      </span>

      {shop.city && (
 <span className="flex items-center gap-1 text-[11px] text-muted">
 <MapPin className="h-3 w-3" /> {shop.city}
        </span>
      )}
    </Link>
  );
}

/// Dernière case de la grille boutique : invite à publier un produit.
function PublishShopCard({
  canSell,
  hasShop,
}: {
  canSell: boolean;
  hasShop: boolean;
}) {
  return (
 <div className="flex h-full flex-col items-center justify-center gap-2 rounded-sm bg-surface p-3 text-center">
 <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border bg-primary text-primary-foreground">
 <Store className="h-5 w-5" />
      </span>
      <div>
 <p className="font-display text-sm font-extrabold">Publiez un produit</p>
 <p className="mt-0.5 text-[11px] text-muted">
          {hasShop
            ? "Votre boutique est prête à grandir."
            : "Ouvrez votre boutique et lancez-vous."}
        </p>
      </div>
 <Link href="/play/sell" className={`${btnPrimary} px-4 py-2 text-xs`}>
        {canSell
          ? hasShop
            ? "Publier un produit"
            : "Ouvrir ma boutique"
          : "Devenir vendeur"}
 <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

/// Un catalogue vide est le premier écran d'un compte neuf : plutôt qu'une
/// ligne de texte, on propose l'action qui a du sens selon le rôle.
function EmptyCatalogue({
  canSell,
  hasShop,
}: {
  canSell: boolean;
  hasShop: boolean;
}) {
  return (
 <div className="rounded-sm border-2 border-dashed border-border py-14 text-center">
 <p className="text-muted">Aucun produit pour le moment.</p>
      {canSell ? (
 <Link href="/play/sell" className={`${btnPrimary} mt-4`}>
          {hasShop ? "Publier un produit" : "Ouvrir ma boutique"}
 <ArrowRight className="h-4 w-4" />
        </Link>
      ) : (
 <p className="mx-auto mt-2 max-w-sm text-xs text-muted">
          Les vendeurs publient chaque jour : revenez bientôt, ou activez une
          alerte depuis une fiche produit.
        </p>
      )}
    </div>
  );
}