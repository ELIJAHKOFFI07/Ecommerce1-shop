import type { ReactNode } from "react";

/// Primitives de mise en page reprises de l'approche « composition » du
/// projet Turbodeal : une carte se construit par assemblage (Card >
/// CardHeader / CardContent / CardFooter) plutôt qu'avec un empilement de
/// classes répété à chaque usage.
///
/// Refonte minimaliste : plus de bordure dure ni d'ombre portée (style
/// néo-brutal supprimé). Les cartes sont de simples aplats `bg-surface`,
/// sans arrondi imposé, pour laisser au consommateur le soin de composer
/// le rythme (padding, rayon, séparateurs). Traduction des jetons de
/// couleur — indispensable, les deux projets ne nomment pas les mêmes
/// choses : leur `bg-card` → notre `bg-surface`, leur `text-muted-foreground`
/// → notre `text-muted`.

export function Card({
  children,
  className = "",
  variant = "default",
  accent = false,
}: {
  children: ReactNode;
  className?: string;
  /// `default` : aplat `bg-surface` à léger arrondi (4px). `minimal` : aplat
  /// nu, sans arrondi ni padding — le consommateur contrôle tout le reste.
  variant?: "default" | "minimal";
  /// Filet de couleur discret en haut de carte (opt-in). Remplace l'ancien
  /// `accent` toujours présent : ici rien n'est coloré sauf si demandé.
  accent?: boolean;
}) {
  const base = variant === "minimal" ? "bg-surface" : "bg-surface rounded-sm";
  return (
    <div
      className={`${base} ${className}`}
      style={accent ? { borderTop: "2px solid var(--accent)" } : undefined}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`p-6 pb-3 lg:p-7 lg:pb-4 ${className}`}>{children}</div>;
}

export function CardTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`text-xl font-medium tracking-tight lg:text-2xl ${className}`}>{children}</h3>
  );
}

export function CardContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`p-6 pt-0 lg:p-7 lg:pt-0 ${className}`}>{children}</div>;
}

export function CardFooter({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
}
