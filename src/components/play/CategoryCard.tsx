import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Category } from "@/lib/types";

/// Palette de fond des cartes de catégorie.
///
/// Purement décorative : elle ne code aucune information, chaque catégorie
/// reçoit simplement une teinte stable. L'attribution suit l'identifiant et
/// non la position, pour qu'une catégorie garde sa couleur même si l'ordre
/// d'affichage change.
const GRADIENTS = [
  "from-[#1f5fae] to-[#3987e5]",
  "from-[#0f7a55] to-[#199e70]",
  "from-[#8a6a12] to-[#c98500]",
  "from-[#6b3fb0] to-[#9085e9]",
  "from-[#b32744] to-[#e0708f]",
  "from-[#a8501a] to-[#e8823d]",
];

function gradientFor(id: string): string {
  // Somme des codes de caractères : stable d'un rendu à l'autre, et
  // indépendante de la position dans la liste.
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return GRADIENTS[sum % GRADIENTS.length];
}

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/play/search?category=${category.id}`}
      className="press group relative flex h-28 w-full flex-col justify-end overflow-hidden rounded-2xl border border-border p-4 transition-all duration-300 hover:border-gold/60 hover:shadow-lg lg:h-32"
    >
      {/* Visuel s'il en existe un, dégradé sinon : une catégorie sans image
          reste présentable, elle ne laisse pas un rectangle vide. */}
      {category.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={category.image_url}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      ) : (
        <span
          aria-hidden
          className={`absolute inset-0 bg-gradient-to-br ${gradientFor(
            category.id,
          )} opacity-25 transition-all duration-500 group-hover:scale-110 group-hover:opacity-40`}
        />
      )}

      {/* Voile sombre : garantit la lisibilité du nom quelle que soit la
          teinte tirée pour cette catégorie. */}
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent"
      />

      {/* Initiale en filigrane, en guise d'ornement. */}
      <span
        aria-hidden
        className="absolute -right-2 -top-4 select-none text-7xl font-black leading-none text-foreground/[0.07] transition-transform duration-500 group-hover:scale-110 lg:text-8xl"
      >
        {category.name.charAt(0).toUpperCase()}
      </span>

      <span className="relative flex items-end justify-between gap-2">
        <span className="text-sm font-semibold leading-tight transition-colors group-hover:text-gold lg:text-base">
          {category.name}
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 translate-y-1 text-gold opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100" />
      </span>
    </Link>
  );
}
