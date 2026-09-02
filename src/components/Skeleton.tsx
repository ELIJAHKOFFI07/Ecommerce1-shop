/// Blocs de chargement animés (shimmer), en remplacement des « Chargement… »
/// bruts : la mise en page reste stable pendant le chargement au lieu de
/// sauter quand les données arrivent.
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-shimmer rounded-lg bg-surface-2 ${className}`}
    />
  );
}

/// Cartes produit empilées — accueil, recherche, boutique, listes.
///
/// Reproduit le bandeau de ProductCard (image carrée à gauche, infos à
/// droite dès `sm`) : un squelette en grille alors que la page rend des
/// bandeaux ferait sauter la mise en page à l'arrivée des données, ce que
/// le squelette est justement là pour éviter.
export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-sm border border-border sm:flex-row"
        >
          <Skeleton className="aspect-square w-full shrink-0 rounded-none sm:aspect-auto sm:h-64 sm:w-64 lg:h-72 lg:w-72" />
          <div className="flex flex-1 flex-col justify-center gap-3 p-5 sm:p-8">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-36" />
          </div>
        </div>
      ))}
    </div>
  );
}

/// Liste verticale de cartes — commandes, offres, notifications, messages.
export function ListSkeleton({
  count = 5,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-4 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/// En-tête de page : titre + sous-titre.
export function HeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  );
}
