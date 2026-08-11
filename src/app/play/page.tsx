"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Flame,
  Gavel,
  Gift,
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
import { ShopCard } from "@/components/play/ShopCard";
import { StoriesBar } from "@/components/play/StoriesBar";
import { ScrollCarousel } from "@/components/marketing/ScrollCarousel";
import { ProductGridSkeleton } from "@/components/Skeleton";
import { Card, CardContent, IconBadge } from "@/components/ui/Card";

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
        supabase
          .from("shops")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(6),
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
      <section>
        <StoriesBar />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Accroche personnalisée                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="animate-rise rounded-2xl border border-border bg-surface-2/60 p-6 md:p-8 lg:p-10">
        <div>
          <h1 className="text-2xl font-medium tracking-tight md:text-3xl lg:text-4xl">
            {firstName ? `Bonjour ${firstName} ✦` : "Bienvenue ✦"}
          </h1>
          <p className="mt-2 max-w-lg text-muted lg:text-lg">
            {hasShop
              ? "Gérez vos produits, suivez vos commandes et vos ventes."
              : "Des milliers de produits, des vendeurs vérifiés, la négociation et le paiement Mobile Money."}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {canSell && (
              <Link
                href="/play/sell"
                className="press inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 lg:text-base"
              >
                <Store className="h-4 w-4" />
                {hasShop ? "Gérer ma boutique" : "Ouvrir ma boutique"}
              </Link>
            )}
            <Link
              href="/play/search"
              className="press inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-2.5 text-sm font-medium transition-colors hover:bg-surface-2 lg:text-base"
            >
              Parcourir le catalogue
            </Link>
          </div>

          {profile && (
            <p className="mt-4 text-sm text-accent lg:text-base">
              {profile.loyalty_points} points de fidélité
            </p>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Raccourcis                                                        */}
      {/* ---------------------------------------------------------------- */}
      <section>
        <SectionTitle>Raccourcis</SectionTitle>
        <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
          <ShortcutCard
            href="/play/auctions"
            accent="var(--pillar-deal)"
            icon={<Gavel className="h-6 w-6" />}
            title="Enchères"
            text="Faites la meilleure offre avant la fin du compte à rebours."
          />
          <ShortcutCard
            href="/play/spin"
            accent="var(--pillar-play)"
            icon={<Sparkles className="h-6 w-6" />}
            title="Roue de la chance"
            text="Un tirage offert chaque jour : points ou bon d'achat."
          />
          <ShortcutCard
            href="/play/referral"
            accent="var(--pillar-gift)"
            icon={<Gift className="h-6 w-6" />}
            title="Parrainage"
            text="100 points pour votre filleul, 200 pour vous."
          />
          {canSell ? (
            <ShortcutCard
              href="/play/wallet"
              accent="var(--pillar-sell)"
              icon={<Wallet className="h-6 w-6" />}
              title="Portefeuille"
              text="Vos ventes créditées, retrait en Mobile Money."
            />
          ) : (
            <ShortcutCard
              href="/play/orders"
              accent="var(--pillar-buy)"
              icon={<Package className="h-6 w-6" />}
              title="Mes commandes"
              text="Suivez vos livraisons et vos codes de retrait."
            />
          )}
        </div>
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
          <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
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
            icon={<Zap className="h-5 w-5 text-muted" />}
            action={{ href: "/play/search", label: "Tout voir" }}
          >
            Ventes flash
          </SectionTitle>
          <ProductGrid products={flash} />
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Enchères en cours                                                 */}
      {/* ---------------------------------------------------------------- */}
      {auctions.length > 0 && (
        <section>
          <SectionTitle
            icon={<Gavel className="h-5 w-5 text-muted" />}
            action={{ href: "/play/auctions", label: "Toutes les enchères" }}
          >
            Enchères en cours
          </SectionTitle>
          <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
            {auctions.map((a) => (
              <AuctionTile key={a.id} auction={a} />
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Les plus aimés                                                    */}
      {/* ---------------------------------------------------------------- */}
      {popular.length > 0 && (
        <section>
          <SectionTitle icon={<TrendingUp className="h-5 w-5 text-muted" />}>
            Les plus aimés
          </SectionTitle>
          <ProductGrid products={popular} />
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Boutiques                                                         */}
      {/* ---------------------------------------------------------------- */}
      {shops.length > 0 && (
        <section>
          <SectionTitle icon={<Store className="h-5 w-5 text-muted" />}>
            Boutiques à découvrir
          </SectionTitle>
          <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((s) => (
              <ShopCard key={s.id} shop={s} />
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Nouveautés                                                        */}
      {/* ---------------------------------------------------------------- */}
      <section>
        <SectionTitle
          icon={<Flame className="h-5 w-5 text-muted" />}
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
          <ProductGrid products={regular} />
        )}
      </section>
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
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 lg:mb-8">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-medium tracking-tight lg:text-3xl">
          {icon}
          {children}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted lg:text-base">{subtitle}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="press inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          {action.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

/// Grille produit unique : une seule définition des points de rupture pour
/// toute la page, plutôt que la même liste de classes répétée cinq fois.
function ProductGrid({ products }: { products: Product[] }) {
  return (
    <>
      {/* Sur téléphone, une rubrique longue passe en carrousel : trente
          cartes en grille imposeraient un défilement interminable. */}
      <div className="sm:hidden">
        {products.length > 4 ? (
          <ScrollCarousel itemClassName="w-40">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ScrollCarousel>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>

      <div className="stagger hidden gap-x-5 gap-y-10 sm:gap-x-6 sm:grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </>
  );
}

function AuctionTile({ auction }: { auction: Auction }) {
  const product = auction.products;
  const cover = product?.product_images?.[0]?.url;
  const current = auction.current_bid ?? auction.starting_price;

  return (
    <Link
      href={`/play/product/${auction.product_id}`}
      className="lift press group overflow-hidden rounded-2xl border border-border bg-surface"
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
      <div className="p-3 lg:p-4">
        <p className="line-clamp-1 text-sm font-medium transition-colors group-hover:text-accent lg:text-base">
          {product?.title ?? "Produit"}
        </p>
        <p className="mt-1 text-xs text-muted">Offre actuelle</p>
        <p className="font-bold text-accent lg:text-lg">{formatFcfa(current)}</p>
      </div>
    </Link>
  );
}

function ShortcutCard({
  href,
  accent,
  icon,
  title,
  text,
}: {
  href: string;
  accent: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Link href={href} className="press block h-full">
      <Card accent={accent} hover className="h-full">
        <CardContent className="p-5">
          <IconBadge color={accent}>{icon}</IconBadge>
          <h3 className="font-semibold lg:text-lg">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted lg:text-sm">
            {text}
          </p>
        </CardContent>
      </Card>
    </Link>
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
    <div className="rounded-2xl border border-dashed border-border py-14 text-center">
      <p className="text-muted">Aucun produit pour le moment.</p>
      {canSell ? (
        <Link
          href="/play/sell"
          className="press mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-2.5 text-sm font-semibold text-background"
        >
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
