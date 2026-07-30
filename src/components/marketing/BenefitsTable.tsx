import type { ReactNode } from "react";

export type Benefit = {
  icon: ReactNode;
  title: string;
  text: string;
};

/// « Les avantages en bref » — bloc repris de Turbodeal : un encadré unique
/// avec bandeau de titre puis des lignes séparées par des filets, chaque
/// ligne alignant un libellé à icône (1/3) et son explication (2/3).
///
/// Plus lisible qu'une grille de cartes quand les entrées sont des paires
/// libellé/description de longueur inégale : la colonne de gauche reste
/// scannable, la droite peut respirer.
export function BenefitsTable({
  title,
  subtitle,
  benefits,
}: {
  title: string;
  subtitle?: string;
  benefits: Benefit[];
}) {
  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="border-b border-border bg-surface-2/60 p-8 text-center">
        <h3 className="text-xl font-bold sm:text-2xl">{title}</h3>
        {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
      </div>

      <div className="divide-y divide-border">
        {benefits.map((b) => (
          <div
            key={b.title}
            className="grid grid-cols-1 gap-2 p-6 transition-colors hover:bg-surface-2/40 sm:grid-cols-3 sm:gap-6"
          >
            <div className="flex items-center gap-3 font-semibold text-gold">
              <span className="shrink-0">{b.icon}</span>
              {b.title}
            </div>
            <p className="text-sm text-muted sm:col-span-2">{b.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
