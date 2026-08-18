"use client";

import { CategoryShowcase } from "./CategoryShowcase";

/// Autres catégories non mises en vedette ailleurs : on les regroupe dans
/// « Et bien plus » pour montrer l'étendue du catalogue au visiteur.
const OTHER_CATEGORIES: { label: string; slug: string }[] = [
  { label: "Maison & Déco", slug: "maison" },
  { label: "Beauté & Soins", slug: "beaute" },
  { label: "Chaussures", slug: "chaussures" },
  { label: "Sacs & Accessoires", slug: "accessoires" },
  { label: "Alimentation", slug: "alimentation" },
  { label: "Bébés & Enfants", slug: "enfants" },
  { label: "Sport & Loisirs", slug: "sport" },
  { label: "Véhicules & Pièces", slug: "vehicules" },
  { label: "Immobilier", slug: "immobilier" },
];

export function EtBienPlus() {
  return (
    <CategoryShowcase
      eyebrow="Toujours plus"
      titleLead="Et bien "
      marker="plus"
      accent="vert"
      image="/assets/sections/other.jpg"
      imageAlt="Une multitude d'autres catégories"
      exploreHref="/play/search"
      exploreLabel="Tout explorer"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {OTHER_CATEGORIES.map((cat) => (
          <a
            key={cat.slug}
            href={`/play/search?category=${cat.slug}`}
            className="card-hover flex items-center justify-between gap-2 rounded-2xl border-2 border-border bg-paper p-4 font-display font-bold transition-colors hover:bg-orange-soft"
          >
            <span>{cat.label}</span>
            <span aria-hidden className="text-ink/40">
              →
            </span>
          </a>
        ))}
      </div>
    </CategoryShowcase>
  );
}
