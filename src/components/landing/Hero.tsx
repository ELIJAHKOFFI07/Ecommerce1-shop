import { Check } from "lucide-react";
import { Reveal } from "./Reveal";
import { Marker } from "./Marker";
import { CtaButton, FloatingCard, Pill } from "./Primitives";
import { ASSETS } from "./assets";

const FEATURES = [
  "Sans compte pour explorer",
  "Mobile Money natif",
  "Paiement à la livraison",
];

/// Section héro : accroche à gauche, visuel en arche + cartes flottantes.
export function Hero() {
  return (
    <section className="wax-pattern relative overflow-hidden">
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-orange-soft opacity-70 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 top-1/2 h-80 w-80 rounded-full bg-vert-soft opacity-70 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <Reveal>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border-2 border-ink bg-paper px-4 py-1.5 text-sm font-bold shadow-hard-sm">
              <span className="pulse-ring h-2 w-2 rounded-full bg-vert" />
              La marketplace sociale de Côte d&apos;Ivoire
            </div>
          </Reveal>

          <Reveal>
            <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl xl:text-7xl">
              Ici, le prix
              <br />
              <Marker>se discute</Marker>,
              <br />
              pas la qualité.
            </h1>
          </Reveal>

          <Reveal>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/70 sm:text-xl">
              Achète, vends et surtout{" "}
              <strong className="text-ink">négocie</strong> près de chez toi.
              Paie en Mobile Money ou à la livraison. Et le catalogue ? Il est
              ouvert à tout le monde,{" "}
              <strong className="text-ink">même sans compte</strong>.
            </p>
          </Reveal>

          <Reveal>
            <div className="mt-8 flex flex-wrap gap-4">
              <CtaButton href="#catalogue" variant="orange" size="lg">
                Explorer le catalogue
              </CtaButton>
              <CtaButton href="#vendre" variant="paper" size="lg">
                Ouvrir ma boutique
              </CtaButton>
            </div>
          </Reveal>

          <Reveal>
            <div className="mt-8 flex flex-wrap gap-2.5">
              {FEATURES.map((feature) => (
                <Pill key={feature} tone="paper" size="sm">
                  <Check className="h-4 w-4 text-vert" strokeWidth={2.5} />
                  {feature}
                </Pill>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Visuel héro */}
        <Reveal className="relative mx-auto w-full max-w-md">
          <div className="hero-arch relative overflow-hidden border-2 border-ink bg-gradient-to-b from-orange to-orange-deep shadow-hard">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 30% 20%, #fff 0 10px, transparent 11px),radial-gradient(circle at 70% 50%, #fff 0 7px, transparent 8px),radial-gradient(circle at 40% 80%, #fff 0 9px, transparent 10px)",
                backgroundSize: "130px 130px",
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ASSETS.hero}
              alt="Cliente DreamTeamShop avec son téléphone et ses achats"
              className="relative z-10 block h-auto w-full translate-y-4 scale-[1.02]"
            />
          </div>

          <FloatingCard rotation={-4} className="-left-4 top-10 z-20 rounded-2xl border-2 border-ink bg-paper px-4 py-3 shadow-hard-sm sm:-left-10">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-vert-soft">
                <Check className="h-5 w-5 text-vert-deep" strokeWidth={2.6} />
              </span>
              <div>
                <p className="font-display text-sm font-bold leading-tight">
                  Offre acceptée !
                </p>
                <p className="text-xs text-ink/60">
                  45 000 FCFA au lieu de 60 000
                </p>
              </div>
            </div>
          </FloatingCard>

          <FloatingCard
            variant="floaty-slow"
            rotation={3}
            className="-right-3 bottom-24 z-20 rounded-2xl border-2 border-ink bg-ink px-4 py-3 text-cream shadow-hard-orange sm:-right-8"
          >
            <p className="text-[11px] font-bold uppercase tracking-widest text-cream/60">
              Code de retrait
            </p>
            <p className="font-display text-2xl font-extrabold tracking-[0.25em] text-sun">
              4 8 2 9 1 6
            </p>
          </FloatingCard>

          <FloatingCard
            rotation={-2}
            delay={1.2}
            className="bottom-4 left-2 z-20 rounded-2xl border-2 border-ink bg-sun px-4 py-2.5 shadow-hard-sm sm:-left-6"
          >
            <p className="font-display text-sm font-extrabold">
              VENTE FLASH{" "}
              <span className="ml-1 rounded-md bg-ink px-1.5 py-0.5 text-sun">
                −40%
              </span>
            </p>
          </FloatingCard>
        </Reveal>
      </div>
    </section>
  );
}
