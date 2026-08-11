import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Flame,
  Handshake,
  Gavel,
  Gift,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Truck,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/backend/server";
import { isBackendConfigured } from "@/lib/backend/client";
import { formatFcfa, type Category, type Product } from "@/lib/types";
import { LandingHeader } from "@/components/marketing/LandingHeader";
import { LandingFooter } from "@/components/marketing/LandingFooter";
import { HeroCarousel } from "@/components/marketing/HeroCarousel";
import { ScrollCarousel } from "@/components/marketing/ScrollCarousel";
import { BenefitsTable } from "@/components/marketing/BenefitsTable";
import { CountUp } from "@/components/marketing/CountUp";
import { ProductCard } from "@/components/play/ProductCard";
import { CategoryCard } from "@/components/play/CategoryCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  IconBadge,
} from "@/components/ui/Card";
import { Pill, Section, SectionHeading } from "@/components/ui/Section";

/// Page d'accueil publique.
///
/// Structure reprise du projet Turbodeal : bande d'accroche pleine largeur,
/// rubriques en cartes à filet coloré, tableau des avantages, catalogue,
/// citation d'appel puis pied de page en colonnes. Les sections alternent
/// fond de page et surface pour se détacher sans multiplier les traits.
///
/// Le visiteur voit le catalogue et peut ouvrir une fiche produit sans
/// compte : la lecture est publique côté base (policy `products_read`).
/// L'obligation de se connecter n'intervient qu'au moment de commander.
export default async function Home() {
  let products: Product[] = [];
  let categories: Category[] = [];
  let connected = false;
  let counts = { products: 0, shops: 0 };

  // La vitrine doit rester consultable même sans backend configuré : on
  // affiche alors la page sans catalogue plutôt qu'un écran d'erreur.
  if (isBackendConfigured()) {
    const supabase = await createClient();
    const [productRes, categoryRes, userRes, productCount, shopCount] =
      await Promise.all([
        supabase
          .from("products")
          .select("*, product_images(url, position), shops(*)")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(12),
        supabase.from("categories").select("*").order("position"),
        supabase.auth.getUser(),
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase.from("shops").select("id", { count: "exact", head: true }),
      ]);
    products = (productRes.data as Product[]) ?? [];
    categories = (categoryRes.data as Category[]) ?? [];
    connected = Boolean(userRes.data.user);
    counts = {
      products: productCount.count ?? 0,
      shops: shopCount.count ?? 0,
    };
  }

  const cheapest = products.length
    ? Math.min(...products.map((p) => p.price))
    : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader connected={connected} />

      {/* ================================================================ */}
      {/* Bande d'accroche                                                  */}
      {/* ================================================================ */}
      {/* Accroche alignée à gauche sur un aplat léger : la composition
          éditoriale des deux références. Le titre est du texte simple —
          l'animation d'entrée qu'il portait le laissait invisible quand elle
          ne se déclenchait pas. */}
      <section className="relative overflow-hidden border-b border-border bg-surface-2/60">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28 2xl:max-w-[1440px]">
          <div className="max-w-2xl">
            <Pill>
              <Flame className="h-3.5 w-3.5" />
              La marketplace sociale de Côte d&apos;Ivoire
            </Pill>

            <h1 className="mt-6 text-4xl font-medium tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Achetez, vendez et négociez près de chez vous
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-muted sm:text-xl">
              Des milliers de produits, des vendeurs vérifiés, la négociation
              directe et le paiement Mobile Money. Parcourez librement — un
              compte n&apos;est nécessaire que pour commander.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/play"
                className="press inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-8 text-base font-medium text-background transition-colors hover:bg-foreground/90"
              >
                <ShoppingBag className="h-4 w-4" />
                Explorer la boutique
              </Link>
              <Link
                href="/play/register"
                className="press inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border px-8 text-base font-medium transition-colors hover:bg-surface-2"
              >
                Créer un compte
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* Mise en avant                                                     */}
      {/* ================================================================ */}
      {products.length > 0 && (
        <Section tone="fade" className="!py-12">
          <HeroCarousel products={products} />
        </Section>
      )}

      {/* ================================================================ */}
      {/* Trois façons d'utiliser la plateforme                             */}
      {/* ================================================================ */}
      <Section tone="fade">
        <SectionHeading
          title="Trois façons d'en profiter"
          subtitle="Que vous veniez acheter, négocier ou vendre, tout se passe au même endroit."
        />

        <div className="stagger grid gap-6 md:grid-cols-3">
          <PillarCard
            accent="var(--pillar-buy)"
            icon={<ShoppingBag className="h-7 w-7" />}
            title="Acheter"
            tagline="Le catalogue à portée de main"
            text="Parcourez librement, comparez, puis commandez en Mobile Money ou à la livraison."
            points={[
              ["Sans compte :", "consultez tout le catalogue avant de vous inscrire."],
              ["Paiement souple :", "Orange, MTN, Moov, Wave ou à la réception."],
              ["Suivi :", "code de retrait à 6 chiffres pour chaque colis."],
            ]}
          />

          <PillarCard
            accent="var(--pillar-deal)"
            icon={<Handshake className="h-7 w-7" />}
            title="Négocier"
            tagline="Le juste prix, directement"
            text="Proposez votre prix au vendeur, discutez en direct et remportez des enchères."
            points={[
              ["Offres :", "proposez entre 50 % et 100 % du prix affiché."],
              ["Messagerie :", "échangez avec le vendeur avant d'acheter."],
              ["Enchères :", "surenchère minimale et prolongation anti-sniping."],
            ]}
          />

          <PillarCard
            accent="var(--pillar-sell)"
            icon={<Store className="h-7 w-7" />}
            title="Vendre"
            tagline="Votre boutique en une minute"
            text="Publiez vos produits, suivez vos commandes et encaissez vos ventes."
            points={[
              ["Boutique :", "photos, stock, variantes et mise en avant."],
              ["Portefeuille :", "ventes créditées, retrait en Mobile Money."],
              ["Visibilité :", "stories, boost produit et fil de nouveautés."],
            ]}
          />
        </div>
      </Section>

      {/* ================================================================ */}
      {/* Catégories                                                        */}
      {/* ================================================================ */}
      {categories.length > 0 && (
        <Section tone="raised" className="!py-12">
          <h2 className="mb-5 text-lg font-semibold">
            Parcourir par catégorie
          </h2>
          <div className="stagger grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        </Section>
      )}

      {/* ================================================================ */}
      {/* Catalogue                                                         */}
      {/* ================================================================ */}
      <Section>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-medium tracking-tight sm:text-3xl lg:text-4xl">
              Nos produits disponibles
            </h2>
            <p className="mt-2 text-sm text-muted lg:text-base">
              {products.length > 0
                ? `Les dernières trouvailles, à partir de ${formatFcfa(cheapest)}.`
                : "Le catalogue se remplit, revenez très vite."}
            </p>
          </div>
          <Link
            href="/play"
            className="press underline-grow inline-flex items-center gap-1.5 text-sm font-semibold text-accent"
          >
            Tout voir
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="text-muted">Aucun produit disponible pour le moment.</p>
            <Link
              href="/play/register"
              className="press mt-4 inline-block rounded-full bg-foreground px-6 py-2.5 text-sm font-semibold text-background"
            >
              Devenir vendeur
            </Link>
          </div>
        ) : (
          <>
            {/* Carrousel sur mobile : douze cartes en grille imposeraient un
                défilement vertical interminable sur un téléphone. */}
            <div className="sm:hidden">
              <ScrollCarousel itemClassName="w-40">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </ScrollCarousel>
            </div>
            <div className="stagger hidden gap-x-6 gap-y-10 sm:grid sm:grid-cols-2 lg:grid-cols-4">
              {products.slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </>
        )}
      </Section>

      {/* ================================================================ */}
      {/* Avantages en bref                                                 */}
      {/* ================================================================ */}
      <Section tone="raised">
        <BenefitsTable
          title="Les avantages en bref"
          subtitle="Ce que la plateforme change concrètement pour vous"
          benefits={[
            {
              icon: <BadgeCheck className="h-5 w-5" />,
              title: "Confiance",
              text: "Boutiques validées avant publication, avis vérifiés issus de commandes réelles, et signalement en un clic.",
            },
            {
              icon: <Truck className="h-5 w-5" />,
              title: "Livraison",
              text: "Suivi de chaque étape et code de retrait à 6 chiffres connu du seul acheteur : aucune commande ne se perd.",
            },
            {
              icon: <Smartphone className="h-5 w-5" />,
              title: "Paiement",
              text: "Orange Money, MTN, Moov et Wave, ou paiement à la livraison si vous préférez régler en main propre.",
            },
            {
              icon: <Wallet className="h-5 w-5" />,
              title: "Encaissement",
              text: "Vos ventes livrées sont créditées automatiquement, commission déduite, avec retrait en Mobile Money.",
            },
            {
              icon: <Gavel className="h-5 w-5" />,
              title: "Enchères",
              text: "Durée limitée, surenchère minimale et prolongation automatique si une offre tombe dans les dernières minutes.",
            },
            {
              icon: <Gift className="h-5 w-5" />,
              title: "Fidélité",
              text: "Points sur chaque commande livrée, roue de la chance quotidienne et bonus de parrainage convertibles en bons d'achat.",
            },
          ]}
        />
      </Section>

      {/* ================================================================ */}
      {/* Chiffres                                                          */}
      {/* ================================================================ */}
      <Section className="!py-12">
        <div className="mx-auto grid max-w-3xl grid-cols-3 gap-6 text-center">
          <StatBlock value={counts.products} label="produits en ligne" />
          <StatBlock value={counts.shops} label="boutiques" />
          <StatBlock value={categories.length} label="catégories" />
        </div>
      </Section>

      {/* ================================================================ */}
      {/* Citation + appel                                                  */}
      {/* ================================================================ */}
      <Section tone="raised">
        <div className="mx-auto max-w-2xl space-y-8 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-accent" />
          <blockquote className="text-lg font-medium italic text-muted sm:text-xl">
            « Une marketplace n&apos;a de valeur que si l&apos;acheteur et le
            vendeur s&apos;y sentent également protégés. C&apos;est la règle
            que nous appliquons à chaque commande. »
          </blockquote>

          <div className="pt-2">
            <h3 className="text-2xl font-medium tracking-tight sm:text-3xl">
              Prêt à ouvrir votre boutique ?
            </h3>
            <p className="mx-auto mt-3 max-w-lg text-muted">
              Créez votre compte en une minute, publiez vos produits et
              encaissez vos ventes en Mobile Money.
            </p>
            <Link
              href="/play/register"
              className="press mt-7 inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-3.5 font-semibold text-background"
            >
              Commencer gratuitement
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Section>

      <LandingFooter />
    </div>
  );
}

/// Carte de rubrique : filet coloré en haut, pastille d'icône, accroche
/// puis liste à puces cochées. Le motif vient de Turbodeal, où il sert à
/// présenter trois offres côte à côte de façon comparable.
function PillarCard({
  accent,
  icon,
  title,
  tagline,
  text,
  points,
}: {
  accent: string;
  icon: React.ReactNode;
  title: string;
  tagline: string;
  text: string;
  points: [string, string][];
}) {
  return (
    <Card accent={accent} hover className="h-full">
      <CardHeader>
        <IconBadge color={accent}>{icon}</IconBadge>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <p
          className="mt-1 text-xs font-semibold uppercase tracking-wider"
          style={{ color: accent }}
        >
          {tagline}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted lg:text-base">{text}</p>
        <ul className="space-y-3">
          {points.map(([lead, rest]) => (
            <li key={lead} className="flex items-start gap-2">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0"
                style={{ color: accent }}
              />
              <span className="text-sm text-muted lg:text-[0.95rem]">
                <strong className="font-semibold text-foreground">
                  {lead}
                </strong>{" "}
                {rest}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-3xl font-bold text-accent sm:text-4xl">
        <CountUp to={value} />
      </p>
      <p className="mt-1 text-xs text-muted sm:text-sm">{label}</p>
    </div>
  );
}
