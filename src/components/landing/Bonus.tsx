import { Clapperboard, Dices, Gift, Heart, Sparkles, UserPlus } from "lucide-react";
import { Reveal } from "./Reveal";
import { Wheel } from "./Wheel";
import { CtaButton, FloatingCard, IconBadge } from "./Primitives";

const PERKS: {
  value: string;
  tone: "orange" | "sun" | "vert" | "ink";
  icon: React.ReactNode;
  text: React.ReactNode;
}[] = [
  {
    value: "+200 pts",
    tone: "orange",
    icon: <UserPlus className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />,
    text: (
      <>
        pour toi à chaque filleul parrainé{" "}
        <span className="text-foreground/40">(+100 pts pour lui)</span>
      </>
    ),
  },
  {
    value: "1 tirage",
    tone: "sun",
    icon: <Dices className="h-5 w-5 text-foreground" strokeWidth={2.5} />,
    text: "gratuit chaque jour à la roue de la chance",
  },
  {
    value: "Stories",
    tone: "vert",
    icon: <Clapperboard className="h-5 w-5 text-secondary-foreground" strokeWidth={2.5} />,
    text: "suis les nouveautés de tes boutiques façon réseau social",
  },
  {
    value: "Wishlists",
    tone: "ink",
    icon: <Heart className="h-5 w-5 text-sun" strokeWidth={2.5} />,
    text: "garde tes coups de cœur et compare les produits",
  },
];

/// Gamification : roue de la chance + avantages fidélité. Ambiance
/// « stand de jeu » : badges récompenses flottants autour de la roue,
/// avantages en tickets poinçonnés et barre de progression façon niveau.
export function Bonus() {
  return (
    <section
      id="bonus"
      className="relative overflow-hidden border-y-2 border-border bg-secondary py-16 text-secondary-foreground sm:py-24"
    >
      {/* Halos de couleur + confettis : profondeur sur l'aplat vert profond. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-sun/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, var(--sun) 0 5px, transparent 6px),radial-gradient(circle at 85% 30%, var(--background) 0 5px, transparent 6px),radial-gradient(circle at 30% 80%, var(--primary) 0 5px, transparent 6px),radial-gradient(circle at 70% 90%, var(--sun) 0 5px, transparent 6px)",
          backgroundSize: "170px 170px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          {/* Roue entourée de badges récompenses flottants. */}
          <div className="relative mx-auto w-full max-w-sm">
            <FloatingCard rotation={6} className="-right-2 -top-6 z-10 sm:-right-8">
              <div className="card-hard-cream flex items-center gap-2.5 rounded-2xl bg-sun px-4 py-3">
                <Gift className="h-6 w-6 shrink-0 text-foreground" strokeWidth={2.4} />
                <div>
                  <p className="font-display text-lg font-extrabold leading-tight text-foreground">
                    +200 pts
                  </p>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-foreground/60">
                    par filleul parrainé
                  </p>
                </div>
              </div>
            </FloatingCard>
            <FloatingCard rotation={-5} delay={1.2} className="-left-2 bottom-20 z-10 sm:-left-8">
              <div className="card-hard-sun flex items-center gap-2.5 rounded-2xl bg-card px-4 py-3">
                <Sparkles className="h-6 w-6 shrink-0 text-vert-deep" strokeWidth={2.4} />
                <div>
                  <p className="font-display text-lg font-extrabold leading-tight text-foreground">
                    1 tirage / jour
                  </p>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-foreground/50">
                    à la roue de la chance
                  </p>
                </div>
              </div>
            </FloatingCard>
            <Wheel />
          </div>

          <Reveal delay={0.1}>
            <p className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-sun">
              Jouer, c&apos;est gagner
            </p>
            <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Shopping + fun =
              <br />
              <span className="text-sun">DreamTeam</span>.
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/75">
              Chaque visite rapporte. Stories des boutiques, points de fidélité,
              parrainage récompensé et une roue de la chance quotidienne — de quoi
              revenir chaque jour avec le sourire.
            </p>

            {/* Les avantages en tickets poinçonnés, avec ombre jaune soleil. */}
            <div className="mt-8 grid max-w-lg gap-4 sm:grid-cols-2">
              {PERKS.map((perk) => (
                <div
                  key={perk.value}
                  className="card-hard-sun relative rounded-2xl bg-card px-5 py-4"
                >
                  <span
                    aria-hidden
                    className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-border bg-vert-deep"
                  />
                  <span
                    aria-hidden
                    className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-border bg-vert-deep"
                  />
                  <IconBadge tone={perk.tone} size="sm">
                    {perk.icon}
                  </IconBadge>
                  <p className="mt-3 font-display text-2xl font-extrabold text-vert-deep">
                    {perk.value}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground/70">{perk.text}</p>
                </div>
              ))}
            </div>

            {/* Barre de progression façon jeu vidéo. */}
            <div className="mt-8 max-w-lg rounded-2xl border-2 border-border bg-white/10 p-4">
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="uppercase tracking-wider text-white/60">Niveau 3</span>
                <span className="font-display text-base text-white">2 350 pts</span>
              </div>
              <div className="mt-3 h-4 overflow-hidden rounded-full border-2 border-border bg-white/10">
                <div className="h-full w-[62%] rounded-full bg-sun" />
              </div>
              <p className="mt-2 text-xs font-medium text-white/50">
                Encore <span className="font-bold text-sun">650 pts</span> avant le
                palier « Gold ».
              </p>
            </div>

            <CtaButton href="/play/spin" variant="sun" size="lg" className="mt-8">
              Lancer la roue de la chance
            </CtaButton>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
