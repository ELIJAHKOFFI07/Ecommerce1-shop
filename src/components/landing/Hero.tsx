import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { HeroSearch } from "./HeroSearch";

/// Héro minimaliste : accroche, recherche, un seul CTA secondaire.
///
/// La recherche est passée devant les boutons : c'est par elle qu'on entre
/// dans un catalogue, pas par une page d'atterrissage. Les trois pastilles
/// d'arguments (« Mobile Money natif »…) ont sauté avec le reste des
/// remplissages — elles répétaient ce que le reste de la page dit déjà.
export function Hero() {
  return (
    <section className="bg-background">
      <div className="mx-auto grid max-w-7xl items-center px-10 gap-10  lg:grid-cols-2 ">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Achetez, vendez et{" "}
            <span className="text-accent">négociez</span> en Côte d&apos;Ivoire.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            La marketplace sociale où le prix se discute. Partez à la recherche
            du meilleur deal, payez en Mobile Money ou à la livraison — même
            sans compte.
          </p>
          <HeroSearch />

          <div className="mt-6">
            <Link
              href="/play/sell"
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              Ouvrir ma boutique
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>
        </div>

        <div className="relative">
          {/* Image lifestyle locale — pas de domaine distant requis. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/hero.png"
            alt="Cliente DreamTeamShop avec son téléphone et ses achats"
            className="w-full rounded-sm bg-surface object-cover"
          />
        </div>
      </div>
    </section>
  );
}
