import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Pill } from "./Primitives";

const FEATURES = [
  "Sans compte pour explorer",
  "Mobile Money natif",
  "Paiement à la livraison",
];

/// Héro minimaliste : accroche + double CTA. Une seule image lifestyle
/// (locale, aucun domaine distant), sans arche ni cartes flottantes. Le
/// contraste fort du CTA principal (encre sur fond) suffit à guider l'œil.
export function Hero() {
  return (
    <section className="bg-background">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
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
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/play/search"
              className={buttonVariants({ variant: "primary", size: "lg" })}
            >
              Explorer le catalogue
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            <Link
              href="/play/sell"
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              Ouvrir ma boutique
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {FEATURES.map((feature) => (
              <Pill key={feature}>
                <Check className="h-4 w-4 text-accent" strokeWidth={2.5} />
                {feature}
              </Pill>
            ))}
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
