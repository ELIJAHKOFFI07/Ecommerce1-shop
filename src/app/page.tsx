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
import { Reveal } from "@/components/marketing/Reveal";
import { Marquee } from "@/components/marketing/Marquee";
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

  // La vitrine doit rester consultable même sans backend configuré : on
  // affiche alors la page sans catalogue plutôt qu'un écran d'erreur.
  if (isBackendConfigured()) {
    const supabase = await createClient();
    const [productRes, categoryRes, userRes] = await Promise.all([
      supabase
        .from("products")
        .select("*, product_images(url, position), shops(*)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase.from("categories").select("*").order("position"),
      supabase.auth.getUser(),
    ]);
    products = (productRes.data as Product[]) ?? [];
    categories = (categoryRes.data as Category[]) ?? [];
    connected = Boolean(userRes.data.user);
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
        {/* Halos décoratifs : masqués aux lecteurs d'écran et non cliquables. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="animate-drift absolute -left-32 -top-40 h-[26rem] w-[26rem] rounded-full bg-gold/20 blur-[110px]" />
          <div
            className="animate-drift absolute -right-24 top-10 h-[22rem] w-[22rem] rounded-full bg-gold/10 blur-[100px]"
            style={{ animationDelay: "-6s" }}
          />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
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

          <div className="animate-fade h-64 md:h-[26rem]">
            <FloatingBag />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Catégories                                                        */}
      {/* ---------------------------------------------------------------- */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-2 sm:px-6">
          <div className="stagger flex gap-3 overflow-x-auto pb-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/play/search?category=${cat.id}`}
                className="lift press group flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-5 py-4 hover:border-gold/50"
              >
                <span className="text-2xl transition-transform duration-300 group-hover:scale-110">
                  {cat.icon}
                </span>
                <span className="whitespace-nowrap text-xs text-muted transition-colors group-hover:text-foreground">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Catalogue — le cœur de la page pour un visiteur                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
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
          <div className="stagger grid grid-cols-2 gap-4 md:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <Marquee
        items={[
          "Mode",
          "Téléphones",
          "Électronique",
          "Maison",
          "Beauté",
          "Chaussures",
          "Sport",
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
      {/* Appel final                                                       */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-t border-border">
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
