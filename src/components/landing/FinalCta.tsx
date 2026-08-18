import { Reveal } from "./Reveal";
import { CtaButton } from "./Primitives";

/// Dernier appel à l'action avant le pied de page.
export function FinalCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
      <Reveal className="card-hard relative overflow-hidden rounded-blob bg-orange px-6 py-16 text-center sm:p-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, #fff 0 10px, transparent 11px),radial-gradient(circle at 80% 70%, #fff 0 8px, transparent 9px),radial-gradient(circle at 60% 15%, #fff 0 6px, transparent 7px)",
            backgroundSize: "150px 150px",
          }}
        />
        <h2 className="relative font-display text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
          Ta prochaine bonne affaire
          <br />
          t&apos;attend{" "}
          <span className="inline-block -rotate-2 rounded-2xl bg-ink px-3 text-sun">
            déjà
          </span>
          .
        </h2>
        <p className="relative mx-auto mt-6 max-w-xl text-lg text-white/85">
          Rejoins des milliers d&apos;Ivoiriens qui achètent malin, vendent
          facile et négocient chaque jour.
        </p>
        <div className="relative mt-10 flex flex-wrap justify-center gap-4">
          <CtaButton href="#catalogue" variant="ink" size="lg">
            Explorer sans compte
          </CtaButton>
          <CtaButton
            href="#vendre"
            variant="white"
            size="lg"
            withArrow={false}
          >
            Devenir vendeur
          </CtaButton>
        </div>
      </Reveal>
    </section>
  );
}