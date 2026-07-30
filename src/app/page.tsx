import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  BadgeCheck,
  Flame,
  Handshake,
  Smartphone,
  Truck,
} from "lucide-react";
import { createClient } from "@/lib/backend/server";
import { isBackendConfigured } from "@/lib/backend/client";
import { formatFcfa, type Category, type Product } from "@/lib/types";
import { LandingHeader } from "@/components/marketing/LandingHeader";
import { HeroCarousel } from "@/components/marketing/HeroCarousel";
import { ScrollCarousel } from "@/components/marketing/ScrollCarousel";
import { CountUp } from "@/components/marketing/CountUp";
import { Reveal } from "@/components/marketing/Reveal";
import { Marquee } from "@/components/marketing/Marquee";
import { Testimonial } from "@/components/marketing/Testimonial";
import { ProductCard } from "@/components/play/ProductCard";

const FloatingBag = dynamic(
  () => import("@/components/three/FloatingBag").then((m) => m.FloatingBag),
);

/// Page d'accueil publique.
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
    <div className="min-h-screen">
      <LandingHeader connected={connected} />

      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        {/* Halos décoratifs : masqués aux lecteurs d'écran, non cliquables. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="animate-drift absolute -left-32 -top-40 h-[26rem] w-[26rem] rounded-full bg-gold/20 blur-[110px]" />
          <div
            className="animate-drift absolute -right-24 top-10 h-[22rem] w-[22rem] rounded-full bg-gold/10 blur-[100px]"
            style={{ animationDelay: "-6s" }}
          />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-medium text-gold">
              <Flame className="h-3.5 w-3.5" />
              La marketplace sociale de Côte d&apos;Ivoire
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
              <Reveal type="line">Achetez.</Reveal>{" "}
              <Reveal type="line" delay={0.08}>
                Vendez.
              </Reveal>
              <br />
              <Reveal type="line" delay={0.16}>
                <span className="bg-gradient-to-r from-gold to-gold-dark bg-clip-text text-transparent">
                  Brillez.
                </span>
              </Reveal>
            </h1>

            <p className="mt-5 max-w-md text-base text-muted sm:text-lg">
              Des milliers de produits près de chez vous, des vendeurs
              vérifiés, la négociation directe et le paiement Mobile Money.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/play"
                className="press sheen inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3 font-semibold text-black"
              >
                Explorer la boutique
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/play/register"
                className="press inline-flex items-center gap-2 rounded-full border border-border px-7 py-3 font-semibold transition-colors hover:border-gold hover:text-gold"
              >
                Créer un compte
              </Link>
            </div>

            <p className="mt-4 text-xs text-muted">
              Parcourez librement — un compte n&apos;est nécessaire que pour
              commander.
            </p>
          </div>

          <div className="animate-fade h-56 md:h-[24rem]">
            <FloatingBag />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Carrousel de mise en avant                                        */}
      {/* ---------------------------------------------------------------- */}
      {products.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
          <HeroCarousel products={products} />
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Catégories                                                        */}
      {/* ---------------------------------------------------------------- */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <h2 className="mb-4 text-lg font-semibold">Parcourir par catégorie</h2>
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
      {/* Catalogue                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Nouveautés</h2>
            <p className="mt-1 text-sm text-muted">
              {products.length > 0
                ? `Les dernières trouvailles, à partir de ${formatFcfa(cheapest)}.`
                : "Le catalogue se remplit, revenez très vite."}
            </p>
          </div>
          <Link
            href="/play"
            className="press underline-grow inline-flex items-center gap-1.5 text-sm font-medium text-gold"
          >
            Tout voir
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="text-muted">Aucun produit publié pour le moment.</p>
            <Link
              href="/play/register"
              className="press mt-4 inline-block rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-black"
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
            <div className="stagger hidden gap-4 sm:grid sm:grid-cols-3 lg:grid-cols-4">
              {products.slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Chiffres                                                          */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-y border-border bg-surface/40 py-12">
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-6 px-4 text-center sm:px-6">
          <Stat value={counts.products} label="produits en ligne" />
          <Stat value={counts.shops} label="boutiques" />
          <Stat value={categories.length} label="catégories" />
        </div>
      </section>

      <Marquee
        items={[
          "Livraison rapide",
          "Vendeurs vérifiés",
          "Mobile Money",
          "Négociez le prix",
          "Enchères",
          "Points de fidélité",
        ]}
      />

      {/* ---------------------------------------------------------------- */}
      {/* Arguments                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Reveal>
          <h2 className="mb-10 text-center text-3xl font-bold sm:text-4xl">
            Pourquoi ElijahShop ?
          </h2>
        </Reveal>
        <div className="stagger grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Feature
            icon={<BadgeCheck className="h-5 w-5" />}
            title="Vendeurs vérifiés"
            text="Chaque boutique est validée avant publication."
          />
          <Feature
            icon={<Handshake className="h-5 w-5" />}
            title="Négociez le prix"
            text="Proposez votre offre directement au vendeur."
          />
          <Feature
            icon={<Smartphone className="h-5 w-5" />}
            title="Mobile Money"
            text="Orange, MTN, Moov et Wave — ou à la livraison."
          />
          <Feature
            icon={<Truck className="h-5 w-5" />}
            title="Livraison suivie"
            text="Code de retrait à 6 chiffres pour chaque colis."
          />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Avis                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <Reveal>
          <h2 className="mb-10 text-center text-3xl font-bold sm:text-4xl">
            Ils vendent déjà avec nous
          </h2>
        </Reveal>
        <div className="stagger grid gap-6 md:grid-cols-3">
          {/* Contenu d'exemple à remplacer par de vrais témoignages avant
              la mise en ligne. `progress` ne pilote qu'une barre décorative,
              elle n'affiche aucun chiffre. */}
          <Testimonial
            quote="J'ai vendu mes trois premiers articles la semaine de mon inscription."
            author="Aminata"
            role="Mode, Cocody"
            progress={92}
          />
          <Testimonial
            quote="Le code de retrait rassure mes clients, plus aucune commande perdue."
            author="Yao"
            role="Électronique, Plateau"
            progress={78}
          />
          <Testimonial
            quote="La négociation directe m'évite de baisser mes prix affichés."
            author="Fatou"
            role="Beauté, Yopougon"
            progress={85}
          />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Appel final                                                       */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-t border-border">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="animate-drift absolute left-1/2 top-1/2 h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/15 blur-[120px]" />
        </div>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <Reveal>
            <h2 className="text-3xl font-bold sm:text-4xl">
              Prêt à ouvrir votre boutique ?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-muted">
              Créez votre compte en une minute, publiez vos produits et
              encaissez vos ventes en Mobile Money.
            </p>
            <Link
              href="/play/register"
              className="press sheen mt-7 inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3.5 font-semibold text-black"
            >
              Commencer gratuitement
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-muted sm:px-6">
          <span className="font-semibold text-gold">ElijahShop</span>
          <nav className="flex flex-wrap gap-5">
            <Link href="/play" className="underline-grow hover:text-foreground">
              Boutique
            </Link>
            <Link
              href="/play/search"
              className="underline-grow hover:text-foreground"
            >
              Rechercher
            </Link>
            <Link
              href="/play/login"
              className="underline-grow hover:text-foreground"
            >
              Se connecter
            </Link>
          </nav>
          <span className="text-xs">
            © {new Date().getFullYear()} ElijahShop
          </span>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-3xl font-bold text-gold sm:text-4xl">
        <CountUp to={value} />
      </p>
      <p className="mt-1 text-xs text-muted sm:text-sm">{label}</p>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="lift rounded-2xl border border-border bg-surface p-5">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
        {icon}
      </span>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </div>
  );
}
