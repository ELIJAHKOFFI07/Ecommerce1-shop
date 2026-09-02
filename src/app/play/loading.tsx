import { Skeleton, ProductGridSkeleton } from "@/components/Skeleton";

/// Squelette de chargement de l'app /play.
///
/// Il doit refléter la structure RÉELLE de la page d'accueil (recherche,
/// catégories, produits) : un squelette qui décrit une autre mise en page
/// que celle qui arrive fait « sauter » l'écran au moment où les données
/// remplacent les blocs — c'est précisément ce qu'un squelette est censé
/// éviter.
export default function Loading() {
  return (
    <div className="space-y-10 lg:space-y-14">
      {/* Recherche */}
      <section className="space-y-4">
        <Skeleton className="h-[60px] w-full rounded-sm" />
        <Skeleton className="h-9 w-36 rounded-sm" />
      </section>

      {/* Catégories : six tuiles carrées + libellés, comme CategoryCard. */}
      <section className="space-y-5">
        <SectionHeaderSkeleton />
        <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-square w-full rounded-sm" />
              <Skeleton className="mx-auto mt-2.5 h-4 w-3/4" />
            </div>
          ))}
        </div>
      </section>

      {/* Produits */}
      <section className="space-y-5">
        <SectionHeaderSkeleton />
        <ProductGridSkeleton count={4} />
      </section>
    </div>
  );
}

/// Ligne de titre de rubrique : titre à gauche, lien « Tout voir » à droite —
/// mêmes dimensions que SectionTitle de la page d'accueil.
function SectionHeaderSkeleton() {
  return (
    <div className="flex items-end justify-between gap-4">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-5 w-24" />
    </div>
  );
}
