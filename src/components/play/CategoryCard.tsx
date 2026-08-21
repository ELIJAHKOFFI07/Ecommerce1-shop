import Link from "next/link";
import {
  Armchair,
  Baby,
  Building2,
  Car,
  Dumbbell,
  Footprints,
  Laptop,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/lib/types";

/// Icône de rubrique par slug de catégorie. Le champ `icon` de la base porte
/// un emoji ; on préfère ici des icônes de la même famille (lucide) pour
/// l'homogénéité graphique. Toute catégorie inconnue retombe sur un sac.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  mode: Shirt,
  telephones: Smartphone,
  electronique: Laptop,
  maison: Armchair,
  beaute: Sparkles,
  chaussures: Footprints,
  accessoires: ShoppingBag,
  alimentation: Utensils,
  enfants: Baby,
  sport: Dumbbell,
  vehicules: Car,
  immobilier: Building2,
};

const FALLBACK_ICON: LucideIcon = ShoppingBag;

/// Vignette de catégorie.
///
/// Le cadre ne contient que la tuile (fond `surface-2` + icône ou image) ; le
/// nom vit à l'extérieur, sous la tuile. La tuile porte un `press` au survol
/// (comme le bouton « Tout voir ») pour marquer l'affordance tactile.
export function CategoryCard({ category }: { category: Category }) {
  const Icon = CATEGORY_ICONS[category.slug] ?? FALLBACK_ICON;

  return (
    <Link
      href={`/play/search?category=${category.id}`}
      className="block"
    >
      <div className="press group flex aspect-square items-center justify-center overflow-hidden rounded-sm bg-surface-2 transition-all">
        {category.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={category.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <Icon aria-hidden className="h-8 w-8 text-foreground lg:h-10 lg:w-10" />
        )}
      </div>

      <span className="mt-2.5 block truncate text-center text-sm font-medium text-foreground">
        {category.name}
      </span>
    </Link>
  );
}