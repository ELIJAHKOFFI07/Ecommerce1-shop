import { ShoppingBag } from "lucide-react";

/// Écran de chargement racine — affiché pendant le streaming de la vitrine
/// publique (/) et de toute route sans loading.tsx dédié.
///
/// Minimaliste : pastille unie, rail de progression sobre (accent), pas de
/// trait cartoon ni de motif. Les animations (loader-progress, points) restent
/// neutralisées par prefers-reduced-motion dans globals.css.
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-9 bg-background px-4 py-16 text-foreground">
      <div className="flex flex-col items-center gap-5">
        <div className="grid h-24 w-24 place-items-center rounded-sm bg-foreground text-background">
          <ShoppingBag className="h-11 w-11" strokeWidth={2.2} aria-hidden />
        </div>
        <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
          DreamTeam<span className="text-accent">Shop</span>
        </p>
      </div>

      <div
        role="progressbar"
        aria-label="Chargement de DreamTeamShop"
        aria-busy="true"
        className="relative h-3 w-64 max-w-full overflow-hidden rounded-full bg-surface-2"
      >
        <div className="animate-loader-progress absolute inset-y-0 left-0 w-2/5 rounded-full bg-accent" />
      </div>

      <p className="flex items-center gap-2 text-sm font-medium text-muted">
        <span>On prépare le meilleur</span>
        <span className="flex items-center gap-1 text-foreground" aria-hidden>
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
        </span>
        <span className="text-accent">✦</span>
      </p>
    </div>
  );
}
