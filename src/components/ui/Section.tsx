import type { ReactNode } from "react";

/// Rythme vertical et largeur de page, repris de l'approche Turbodeal :
/// chaque section utilise le même conteneur (`container mx-auto px-4`) et un
/// espacement généreux, avec alternance des fonds pour séparer les blocs
/// sans multiplier les traits de séparation.

export function Section({
  children,
  className = "",
  tone = "plain",
  id,
}: {
  children: ReactNode;
  className?: string;
  /// `plain` : fond de page. `raised` : surface légèrement détachée.
  /// `fade` : dégradé du fond de page vers la surface, pour enchaîner deux
  /// sections sans trait de séparation.
  tone?: "plain" | "raised" | "fade";
  id?: string;
}) {
  const tones = {
    plain: "",
    raised: "bg-surface/40 border-y border-border",
    fade: "bg-gradient-to-b from-background to-surface/40",
  };

  return (
    <section id={id} className={`py-16 md:py-20 ${tones[tone]} ${className}`}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">{children}</div>
    </section>
  );
}

export function SectionHeading({
  title,
  subtitle,
  align = "center",
}: {
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div
      className={`mb-10 ${align === "center" ? "text-center" : ""}`}
    >
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-3 text-muted ${
            align === "center" ? "mx-auto max-w-2xl" : "max-w-2xl"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/// Étiquette courte au-dessus d'un titre (leur `<Badge>`).
export function Pill({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold text-gold ${className}`}
    >
      {children}
    </span>
  );
}
