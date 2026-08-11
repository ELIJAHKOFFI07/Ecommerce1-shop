import type { ReactNode } from "react";

/// Rythme vertical et largeur de page.
///
/// Repris des deux projets de référence (shirt-shop, shopCommerce) : un seul
/// conteneur `max-w-7xl px-4 sm:px-6 lg:px-8`, un espacement vertical large
/// et constant (`py-16 sm:py-24`), et des sections séparées par un aplat ou
/// par le vide — jamais par un dégradé, qui se remarque surtout quand il
/// rate, et qui rate dès que le thème bascule.

export function Section({
  children,
  className = "",
  tone = "plain",
  id,
}: {
  children: ReactNode;
  className?: string;
  /// `plain` : fond de page. `raised` : aplat séparé par un filet.
  /// `fade` : aplat léger, sans filet, pour enchaîner deux sections.
  tone?: "plain" | "raised" | "fade";
  id?: string;
}) {
  const tones = {
    plain: "",
    raised: "border-y border-border bg-surface-2/60",
    fade: "bg-surface-2/40",
  };

  return (
    <section
      id={id}
      className={`py-16 sm:py-20 lg:py-24 ${tones[tone]} ${className}`}
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 2xl:max-w-[1440px]">
        {children}
      </div>
    </section>
  );
}

/// Titre de section.
///
/// `action` place un lien à droite du titre (« Tout voir → ») sur la même
/// ligne de base : c'est le motif de tête de grille des deux références.
/// Il n'a de sens qu'alignés à gauche, d'où le repli automatique.
export function SectionHeading({
  title,
  subtitle,
  align = "center",
  action,
}: {
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  action?: ReactNode;
}) {
  const centered = align === "center" && !action;

  return (
    <div
      className={`mb-10 lg:mb-12 ${
        centered ? "text-center" : "flex items-end justify-between gap-6"
      }`}
    >
      <div>
        <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl lg:text-4xl">
          {title}
        </h2>
        {subtitle && (
          <p
            className={`mt-2 text-muted lg:text-lg ${
              centered ? "mx-auto max-w-2xl" : "max-w-2xl"
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="hidden shrink-0 sm:block">{action}</div>}
    </div>
  );
}

/// Étiquette courte au-dessus d'un titre.
///
/// Neutre et non colorée : dans les deux références, l'attention est portée
/// par la taille du titre, pas par une pastille criarde au-dessus.
export function Pill({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-muted ${className}`}
    >
      {children}
    </span>
  );
}
