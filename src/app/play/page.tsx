"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Gavel,
  Gift,
  Package,
  Sparkles,
  Store,
  Wallet,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { useSession } from "@/lib/session";
import { formatFcfa, type Category, type Product } from "@/lib/types";
import { ProductCard } from "@/components/play/ProductCard";
import { StoriesBar } from "@/components/play/StoriesBar";
import { ScrollCarousel } from "@/components/marketing/ScrollCarousel";
import { ProductGridSkeleton } from "@/components/Skeleton";
import { Card, CardContent, IconBadge } from "@/components/ui/Card";

export default function PlayHome() {
  // Les ventes flash sont extraites de la même requête que le reste : leur
  // afficher une rubrique distincte ne coûte pas d'aller-retour.
  //
  // La répartition est faite au chargement plutôt que pendant le rendu :
  // elle dépend de l'heure courante, valeur qui changerait d'un rendu à
  // l'autre et rendrait l'affichage instable.
  const [flash, setFlash] = useState<Product[]>([]);
  const [regular, setRegular] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasShop, setHasShop] = useState(false);
  const { canSell, profile } = useSession();

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [prodRes, catRes] = await Promise.all([
        supabase
          .from("products")
          .select("*, product_images(url, position), shops(*)")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(24),
        supabase.from("categories").select("*").order("position"),
      ]);
      if (prodRes.error) setError(prodRes.error.message);
      const list = (prodRes.data as Product[]) ?? [];

      const now = Date.now();
      const isLive = (p: Product) =>
        p.is_flash &&
        (!p.flash_ends_at || new Date(p.flash_ends_at).getTime() > now);

      setFlash(list.filter(isLive).slice(0, 4));
      setRegular(list.filter((p) => !isLive(p)));
      setCategories((catRes.data as Category[]) ?? []);
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
    <div className="space-y-10">
      <section>
        <StoriesBar />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Accroche personnalisée                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="animate-rise relative overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/15 to-gold/[0.03] p-6 md:p-8">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="animate-drift absolute -right-16 -top-20 h-64 w-64 rounded-full bg-gold/20 blur-[90px]" />
        </div>

        <div className="relative">
          <h1 className="text-2xl font-bold md:text-3xl">
            {firstName ? `Bonjour ${firstName} ✦` : "Bienvenue ✦"}
          </h1>
          <p className="mt-2 max-w-lg text-muted">
            {hasShop
              ? "Gérez vos produits, suivez vos commandes et vos ventes."
              : "Des milliers de produits, des vendeurs vérifiés, la négociation et le paiement Mobile Money."}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {canSell && (
              <Link
                href="/play/sell"
                className="press sheen inline-flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-black"
              >
                <Store className="h-4 w-4" />
                {hasShop ? "Gérer ma boutique" : "Ouvrir ma boutique"}
              </Link>
            )}
            <Link
              href="/play/search"
              className="press inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-2.5 text-sm font-semibold transition-colors hover:border-gold hover:text-gold"
            >
              Parcourir le catalogue
            </Link>
          </div>

          {profile && (
            <p className="mt-4 text-sm text-gold">
              {profile.loyalty_points} points de fidélité
            </p>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Raccourcis                                                        */}
      {/* ---------------------------------------------------------------- */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Raccourcis</h2>
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
      {/* Ventes flash                                                      */}
      {/* ---------------------------------------------------------------- */}
      {flash.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Zap className="h-5 w-5 text-gold" />
              Ventes flash
            </h2>
            <Link
              href="/play/search"
              className="press underline-grow text-sm font-medium text-gold"
            >
              Tout voir
            </Link>
          </div>
          <div className="stagger grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {flash.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Catégories                                                        */}
      {/* ---------------------------------------------------------------- */}
      {categories.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Catégories</h2>
          <ScrollCarousel itemClassName="w-28">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/play/search?category=${cat.id}`}
                className="lift press group flex h-full flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-4 hover:border-gold/50"
              >
                <span className="text-3xl transition-transform duration-300 group-hover:scale-110">
                  {cat.icon}
                </span>
                <span className="text-center text-xs leading-tight text-muted transition-colors group-hover:text-foreground">
                  {cat.name}
                </span>
              </Link>
            ))}
          </ScrollCarousel>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Nouveautés                                                        */}
      {/* ---------------------------------------------------------------- */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">Nouveautés</h2>
          {regular.length > 0 && (
            <span className="text-sm text-muted">
              À partir de{" "}
              {formatFcfa(Math.min(...regular.map((p) => p.price)))}
            </span>
          )}
        </div>

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
          <div className="stagger grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {regular.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/// Carte de raccourci : filet coloré, pastille d'icône et courte explication.
/// Même motif que les cartes de rubrique de la page d'accueil publique.
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
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">{text}</p>
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
          className="press sheen mt-4 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-black"
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
