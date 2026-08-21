import type { ReactNode } from "react";

/// Primitives de la vitrine — version minimaliste (refonte néo-brutal → plat).
///
/// Plus de bordure 2px, plus d'arrondi plein (rounded-full), plus d'ombre
/// dure : une icône ou une puce n'est qu'un aplat `bg-surface-2` discrètement
/// arrondi (4px max). Tout passe par les jetons de couleur, jamais de #hex.

/* ------------------------------------------------------------------ */
/* Pastille d'icône : aplat plat, arrondi minimal                       */
/* ------------------------------------------------------------------ */

const ICON_BADGE_SIZES = {
  sm: "h-9 w-9 rounded-xs",
  md: "h-11 w-11 rounded-xs",
  lg: "h-14 w-14 rounded-xs",
} as const;

export function IconBadge({
  children,
  size = "md",
  className = "",
}: {
  children: ReactNode;
  size?: keyof typeof ICON_BADGE_SIZES;
  className?: string;
}) {
  return (
    <span
      className={`${ICON_BADGE_SIZES[size]} grid shrink-0 place-items-center bg-surface-2 text-foreground ${className}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Puce / badge : aplat plat, arrondi minimal                          */
/* ------------------------------------------------------------------ */

export function Pill({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-xs bg-surface-2 px-3 py-1.5 text-sm font-medium text-muted ${className}`}
    >
      {children}
    </span>
  );
}
