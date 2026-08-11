import Link from "next/link";
import type { Category } from "@/lib/types";

/// Vignette de catégorie.
///
/// Une tuile, une image, un nom. Les dégradés colorés, le filigrane et la
/// flèche au survol qui l'habillaient auparavant ne portaient aucune
/// information : sur une grille de douze catégories, ils produisaient
/// surtout du bruit. Sans image, la tuile reste un aplat neutre avec
/// l'initiale — présentable, jamais vide.
export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/play/search?category=${category.id}`}
      className="press group block"
    >
      <div className="relative mb-2.5 flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-surface-2">
        {category.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={category.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <span
            aria-hidden
            className="select-none text-3xl font-medium text-muted lg:text-4xl"
          >
            {category.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <span className="block truncate text-center text-sm font-medium text-foreground">
        {category.name}
      </span>
    </Link>
  );
}
