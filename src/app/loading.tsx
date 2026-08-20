import { ShoppingBag } from "lucide-react";

/// Écran de chargement racine — affiché pendant le streaming de la vitrine
/// publique (/) et de toute route sans loading.tsx dédié.
///
/// Plein écran et centré, il porte l'identité néo-brutale du projet (trait
/// encre, ombres dures, accent orange, motif wax) sans dessiner la structure
/// de la page : dessiner un squelette de héro ferait « sauter » la mise en
/// page quand les vrais blocs arrivent. Le badge flotte (floaty), la barre
/// glisse (loader-progress) et les points clignotent (blink) — toutes ces
/// animations sont neutralisées par prefers-reduced-motion dans globals.css.
export default function Loading() {
  return (
    <div className="wax-pattern flex min-h-screen flex-col items-center justify-center gap-9 bg-background px-4 py-16 text-foreground">
      {/* Marque : pastille néo-brutale qui flotte pendant le chargement. */}
      <div className="flex flex-col items-center gap-5">
        <div className="floaty card-hard-orange grid h-24 w-24 place-items-center rounded-3xl bg-primary text-primary-foreground">
          <ShoppingBag className="h-11 w-11" strokeWidth={2.2} aria-hidden />
        </div>
        <p className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          DreamTeam<span className="text-primary">Shop</span>
        </p>
      </div>

      {/* Rail de progression : trait orange dans une bordure encre + ombre dure. */}
      <div
        role="progressbar"
        aria-label="Chargement de DreamTeamShop"
        aria-busy="true"
        className="relative h-3 w-64 max-w-full overflow-hidden rounded-full border-2 border-border bg-surface shadow-hard-sm"
      >
        <div className="animate-loader-progress absolute inset-y-0 left-0 w-2/5 rounded-full bg-primary" />
      </div>

      {/* Pied : message + points clignotants, sur le ton des bandeaux. */}
      <p className="flex items-center gap-2 font-display text-sm font-semibold text-muted">
        <span>On prépare le meilleur</span>
        <span className="flex items-center gap-1 text-foreground" aria-hidden>
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
        </span>
        <span className="text-primary">✦</span>
      </p>
    </div>
  );
}
