import type { ReactNode } from "react";
import { Reveal } from "./Reveal";
import { Marker } from "./Marker";

/// Vitrine catégorie : le titre (eyebrow + h2 + lien) est rendu au-dessus de
/// la carte, comme dans le catalogue. La carte elle-même est à deux colonnes :
/// gauche (~33 %) une image illustrant la catégorie, droite (~66 %) le contenu.
export function CategoryShowcase({
  titleLead,
  marker,
  accent = "vert",
  image,
  imageAlt,
  exploreHref,
  exploreLabel = "Voir la catégorie",
  children,
}: {
  eyebrow: string;
  titleLead: string;
  marker: string;
  accent?: "vert" | "orange";
  image: string;
  imageAlt: string;
  exploreHref: string;
  exploreLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            {titleLead}
            <br />
            <Marker variant={accent}>{marker}</Marker>
          </h2>
        </div>
        <a
          href={exploreHref}
          className="inline-flex items-center gap-2 border-b-4 border-orange pb-1 font-display text-lg font-bold transition-colors hover:text-orange"
        >
          {exploreLabel}
          <span aria-hidden>→</span>
        </a>
      </Reveal>

      <Reveal>
        <div className="card-hard overflow-hidden rounded-3xl bg-cream">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div className="min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={imageAlt}
                className="aspect-[4/5] h-full min-h-[280px] w-full object-cover lg:aspect-auto"
              />
            </div>
            <div className="flex min-w-0 flex-col p-6 sm:p-8">{children}</div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
