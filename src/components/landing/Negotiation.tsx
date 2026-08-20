import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Reveal } from "./Reveal";
import { Marker } from "./Marker";
import { NegotiationDemo } from "./NegotiationDemo";

const CHECKS: ReactNode[] = [
  <>
    Offres encadrées : entre <strong>50 % et 100 %</strong> du prix affiché,
    pour des échanges justes.
  </>,
  <>
    Réponse du vendeur en temps réel : accepté, refusé, ou
    contre-proposition.
  </>,
  <>Le prix négocié s&apos;applique directement à ta commande.</>,
];

/// Section négociation : argumentaire à gauche, simulateur à droite.
export function Negotiation() {
  return (
    <section
      id="negocier"
      className="wax-pattern border-y-2 border-border bg-surface-2/60 py-16 sm:py-24"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <Reveal>
          <p className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-accent-dark">
            La négo, c&apos;est la culture
          </p>
          <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Comme au marché,
            <br />
            mais depuis <Marker>ton canapé</Marker>.
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-foreground/70">
            Sur DreamTeamShop, le prix affiché est un point de départ. Propose
            le tien au vendeur : s&apos;il accepte, c&apos;est gagné. S&apos;il
            hésite, la messagerie est là pour trouver un terrain d&apos;entente.
          </p>
          <ul className="mt-8 space-y-4">
            {CHECKS.map((check, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-border bg-primary">
                  <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
                </span>
                <p className="font-semibold">{check}</p>
              </li>
            ))}
          </ul>
        </Reveal>

        <NegotiationDemo />
      </div>
    </section>
  );
}