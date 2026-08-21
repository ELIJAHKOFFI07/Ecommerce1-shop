import { Skeleton, ProductGridSkeleton } from "@/components/Skeleton";

/// Squelette de chargement de l'app /play — remplace le contenu du layout
/// pendant le streaming des pages (accueil, recherche, fiches…).
///
/// Le layout de /play rend déjà le bandeau défilant et la barre de nav ; ce
/// fichier ne porte que le contenu. Il reproduit la structure de la page
/// d'accueil membre (accroche, bande promo, raccourcis, grilles) avec les
/// blocs shimmer du projet (--surface-2) pour que la mise en page ne « saute »
/// pas quand les données arrivent.
export default function Loading() {
  return (
 <div className="space-y-12 lg:space-y-20">
      {/* Groupe du haut : accroche, bande plein largeur puis raccourcis. */}
 <div className="space-y-4 lg:space-y-5">
        {/* Accroche : titre + pastille points + boutons d'action. */}
 <section className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
 <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
 <Skeleton className="h-7 w-56" />
 <Skeleton className="h-7 w-44 rounded-sm" />
          </div>
 <div className="flex flex-wrap gap-2.5">
 <Skeleton className="h-10 w-44 rounded-sm" />
 <Skeleton className="h-10 w-52 rounded-sm" />
          </div>
        </section>

        {/* Bande promo plein largeur : même cadre que PromoCarousel. */}
 <section className="-mx-4 md:-mx-6 lg:-mx-8">
 <div className="flex h-[300px] items-center gap-6 overflow-hidden rounded-sm bg-surface px-6 sm:px-10">
 <Skeleton className="h-40 w-64 max-w-[60%] flex-1" />
 <Skeleton className="hidden h-24 w-24 shrink-0 rounded-full sm:block" />
          </div>
        </section>

        {/* Raccourcis : quatre pastilles de largeurs proches des vrais libellés. */}
 <section className="flex flex-wrap gap-3">
 <Skeleton className="h-10 w-32 rounded-sm" />
 <Skeleton className="h-10 w-44 rounded-sm" />
 <Skeleton className="h-10 w-40 rounded-sm" />
 <Skeleton className="h-10 w-48 rounded-sm" />
        </section>
      </div>

      {/* Catégories : tuiles carrées + libellés, comme CategoryCard. */}
      <section>
        <SectionHeaderSkeleton />
 <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
 <Skeleton className="aspect-square w-full rounded-sm" />
 <Skeleton className="mx-auto mt-2.5 h-4 w-3/4" />
            </div>
          ))}
        </div>
      </section>

      {/* Ventes flash */}
      <section>
        <SectionHeaderSkeleton />
        <ProductGridSkeleton count={8} />
      </section>

      {/* Nouveautés */}
      <section>
        <SectionHeaderSkeleton />
        <ProductGridSkeleton count={8} />
      </section>
    </div>
  );
}

/// Ligne de titre de rubrique : barre du titre à gauche, pastille d'action à
/// droite — mêmes dimensions que SectionTitle de la page d'accueil.
function SectionHeaderSkeleton() {
  return (
 <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 lg:mb-8">
 <Skeleton className="h-7 w-40" />
 <Skeleton className="h-8 w-24 rounded-sm" />
    </div>
  );
}
