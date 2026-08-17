import { Reveal } from "./Reveal";
import { Wheel } from "./Wheel";

const PERKS: { value: string; text: React.ReactNode }[] = [
  {
    value: "+200 pts",
    text: (
      <>
        pour toi à chaque filleul parrainé{" "}
        <span className="text-white/50">(+100 pts pour lui)</span>
      </>
    ),
  },
  {
    value: "1 tirage",
    text: "gratuit chaque jour à la roue de la chance",
  },
  {
    value: "Stories",
    text: "suis les nouveautés de tes boutiques façon réseau social",
  },
  {
    value: "Wishlists",
    text: "garde tes coups de cœur et compare les produits",
  },
];

/// Gamification : roue de la chance + avantages fidélité.
export function Bonus() {
  return (
    <section
      id="bonus"
      className="relative overflow-hidden border-y-2 border-ink bg-vert-deep py-16 text-white sm:py-24"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 25%, #fff 0 6px, transparent 7px),radial-gradient(circle at 75% 75%, #fff 0 6px, transparent 7px)",
          backgroundSize: "110px 110px",
        }}
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        <Wheel />

        <Reveal>
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
          <div className="mt-8 grid max-w-lg gap-4 sm:grid-cols-2">
            {PERKS.map((perk) => (
              <div
                key={perk.value}
                className="rounded-2xl border-2 border-white/20 bg-white/10 p-5"
              >
                <p className="font-display text-3xl font-extrabold text-sun">
                  {perk.value}
                </p>
                <p className="mt-1 text-sm font-medium text-white/70">
                  {perk.text}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}