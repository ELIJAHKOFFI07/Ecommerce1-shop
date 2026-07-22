import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, ShieldCheck, MessageCircle, Truck, Gift } from "lucide-react";
import { Reveal } from "@/components/marketing/Reveal";
import { Marquee } from "@/components/marketing/Marquee";
import { GhostCard } from "@/components/marketing/GhostCard";
import { Testimonial } from "@/components/marketing/Testimonial";

const FloatingBag = dynamic(
  () => import("@/components/three/FloatingBag").then((m) => m.FloatingBag),
);

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight text-gold">
            ElijahShop
          </span>
          <nav className="hidden gap-8 text-sm text-muted md:flex">
            <a href="#features" className="hover:text-foreground">Fonctionnalités</a>
            <a href="#how" className="hover:text-foreground">Comment ça marche</a>
            <a href="#avis" className="hover:text-foreground">Avis</a>
          </nav>
          <Link
            href="/play"
            className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-black transition-transform hover:scale-105"
          >
            Ouvrir l&apos;app
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative mx-auto grid max-w-7xl items-center gap-8 px-6 py-20 md:grid-cols-2 md:py-28">
        <div>
          <h1 className="text-5xl font-bold leading-[1.05] md:text-7xl">
            <Reveal type="line">Achetez.</Reveal>{" "}
            <Reveal type="line" delay={0.1}>
              <span className="text-gradient-gold">Vendez.</span>
            </Reveal>{" "}
            <Reveal type="line" delay={0.2}>Brillez.</Reveal>
          </h1>
          <Reveal type="fade" delay={0.4} className="mt-6 max-w-md text-lg text-muted">
            <p>
              La marketplace sociale de Côte d&apos;Ivoire. Postez vos produits,
              négociez en direct, payez en Mobile Money. Le tout dans une app
              taillée pour les vendeurs.
            </p>
          </Reveal>
          <Reveal type="fade" delay={0.6}>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/play"
                className="group flex items-center gap-2 rounded-full bg-gold px-7 py-3 font-semibold text-black transition-transform hover:scale-105"
              >
                Commencer gratuitement
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/play/search"
                className="rounded-full border border-border px-7 py-3 font-semibold text-foreground transition-colors hover:border-gold"
              >
                Explorer les produits
              </Link>
            </div>
          </Reveal>
        </div>
        <div className="h-80 md:h-[460px]">
          <FloatingBag />
        </div>
      </section>

      <Marquee
        items={[
          "Boutiques vérifiées",
          "Chat temps réel",
          "Paiement Mobile Money",
          "Négociation d'offres",
          "Livraison suivie",
          "Points de fidélité",
        ]}
      />

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <Reveal type="rotation">
          <h2 className="mb-4 text-4xl font-bold md:text-5xl">
            Tout pour vendre <span className="text-gold">plus vite</span>
          </h2>
        </Reveal>
        <p className="mb-14 max-w-xl text-muted">
          Une plateforme pensée pour le commerce social ivoirien, de la mise en
          ligne à la livraison.
        </p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<ShieldCheck className="h-7 w-7" />}
            title="Boutiques vérifiées"
            body="Un badge de confiance pour les vendeurs sérieux : identité vérifiée, avis clients, taux de réponse."
          />
          <FeatureCard
            icon={<MessageCircle className="h-7 w-7" />}
            title="Chat & négociation"
            body="Discutez en temps réel, faites une offre, recevez une contre-offre. Le meilleur prix se trouve ici."
          />
          <FeatureCard
            icon={<Truck className="h-7 w-7" />}
            title="Livraison suivie"
            body="Zones de livraison, express ou retrait boutique, et un suivi étape par étape jusqu'à réception."
          />
          <FeatureCard
            icon={<Gift className="h-7 w-7" />}
            title="Récompenses"
            body="Points de fidélité, codes promo et bonus de parrainage récompensent chaque achat."
          />
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="border-y border-border bg-surface/40 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal type="rotation">
            <h2 className="mb-14 text-4xl font-bold md:text-5xl">
              Comment ça marche
            </h2>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            <GhostCard number="01" title="Créez votre boutique">
              Inscrivez-vous, ouvrez votre boutique gratuitement et publiez vos
              premiers produits en quelques minutes.
            </GhostCard>
            <GhostCard number="02" title="Vendez & négociez" delay={0.15}>
              Recevez des commandes et des offres, discutez avec vos acheteurs et
              gérez vos statuts de livraison.
            </GhostCard>
            <GhostCard number="03" title="Encaissez" delay={0.3}>
              Le montant de vos ventes est crédité sur votre portefeuille,
              retirable en Mobile Money.
            </GhostCard>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-8 text-center md:grid-cols-3">
          <Stat value="12+" label="Catégories" />
          <Stat value="5%" label="Commission seulement" />
          <Stat value="24/7" label="Chat & support" />
        </div>
      </section>

      {/* AVIS */}
      <section id="avis" className="mx-auto max-w-7xl px-6 py-24">
        <Reveal type="rotation">
          <h2 className="mb-14 text-4xl font-bold md:text-5xl">
            Ils <span className="text-gold">brillent</span> déjà
          </h2>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          <Testimonial
            quote="J'ai doublé mes ventes en un mois. La négociation d'offres change tout."
            author="Aïcha K."
            role="Boutique mode, Cocody"
            progress={92}
          />
          <Testimonial
            quote="Le chat en temps réel me permet de conclure une vente en quelques minutes."
            author="Konan Y."
            role="Électronique, Yopougon"
            progress={85}
          />
          <Testimonial
            quote="Le suivi de livraison rassure mes clients. Zéro litige depuis."
            author="Fatou D."
            role="Cosmétiques, Plateau"
            progress={97}
          />
        </div>
      </section>

      <Marquee
        reverse
        items={[
          "Rejoignez ElijahShop",
          "Ouvrez votre boutique",
          "Vendez sans commission cachée",
          "Brillez",
        ]}
      />

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-28 text-center">
        <Reveal type="rotation">
          <h2 className="text-4xl font-bold md:text-6xl">
            Prêt à <span className="text-gradient-gold">briller</span> ?
          </h2>
        </Reveal>
        <p className="mx-auto mt-6 max-w-lg text-muted">
          Créez votre compte en 30 secondes et lancez votre boutique dès
          aujourd&apos;hui.
        </p>
        <Link
          href="/play"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold px-8 py-4 text-lg font-semibold text-black transition-transform hover:scale-105"
        >
          Démarrer maintenant <ArrowRight className="h-5 w-5" />
        </Link>
      </section>

      <footer className="border-t border-border py-10 text-center text-sm text-muted">
        <p>© {new Date().getFullYear()} ElijahShop — Fait avec ✦ en Côte d&apos;Ivoire.</p>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Reveal type="fade">
      <div className="h-full rounded-2xl border border-border bg-surface p-7 transition-colors hover:border-gold/50">
        <div className="mb-4 inline-flex rounded-xl bg-gold/10 p-3 text-gold">
          {icon}
        </div>
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted">{body}</p>
      </div>
    </Reveal>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Reveal type="fade">
      <div>
        <p className="text-5xl font-bold text-gradient-gold md:text-6xl">
          {value}
        </p>
        <p className="mt-2 text-muted">{label}</p>
      </div>
    </Reveal>
  );
}
