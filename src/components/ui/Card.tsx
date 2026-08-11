import type { ReactNode } from "react";

/// Primitives de mise en page reprises de l'approche « composition » du
/// projet Turbodeal : une carte se construit par assemblage (Card >
/// CardHeader / CardContent / CardFooter) plutôt qu'avec un empilement de
/// classes répété à chaque usage.
///
/// Traduction des jetons de couleur — indispensable, les deux projets ne
/// nomment pas les mêmes choses :
///   leur `bg-card`            → notre `bg-surface`
///   leur `bg-muted` (surface) → notre `bg-surface-2`
///   leur `text-muted-foreground` → notre `text-muted`
///   leur `text-primary`       → notre `text-accent`
/// Utiliser `bg-muted` tel quel ici donnerait un fond gris-texte.

export function Card({
  children,
  className = "",
  accent,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  /// Filet de couleur en haut de carte (leur `border-t-4`), utilisé pour
  /// distinguer des rubriques sans recourir à des fonds colorés.
  accent?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-border bg-surface ${
        hover ? "lift" : ""
      } ${className}`}
      style={accent ? { borderTop: `3px solid ${accent}` } : undefined}
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

/// Pastille ronde qui porte l'icône d'une rubrique.
export function IconBadge({
  children,
  color,
}: {
  children: ReactNode;
  color: string;
}) {
  return (
    <span
      className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full lg:h-16 lg:w-16"
      style={{ backgroundColor: `${color}1f`, color }}
    >
      {children}
    </span>
  );
}
