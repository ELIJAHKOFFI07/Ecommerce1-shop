"use client";

import { useId, useMemo, useState } from "react";
import { Table2 } from "lucide-react";

/// Graphiques SVG sans dépendance externe.
///
/// Règles appliquées partout ici :
///  - une seule échelle par graphique (jamais deux axes verticaux) ;
///  - la couleur suit l'entité, jamais son rang : filtrer ne repeint rien ;
///  - marques fines, grille en filet discret, extrémités arrondies 4px ;
///  - séparation de 2px de la couleur de fond entre deux aires voisines,
///    plutôt qu'un contour dessiné autour des marques ;
///  - une vue tableau accompagne chaque graphique : l'infobulle enrichit la
///    lecture, elle ne doit jamais être le seul moyen d'obtenir une valeur.

export const VIZ_SLOTS = [
  "var(--viz-1)",
  "var(--viz-2)",
  "var(--viz-3)",
  "var(--viz-4)",
  "var(--viz-5)",
  "var(--viz-6)",
] as const;

export type Slice = { label: string; value: number };

function useNumberFormat() {
  return useMemo(
    () => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }),
    [],
  );
}

/* ------------------------------------------------------------------ */
/* Carte + vue tableau                                                 */
/* ------------------------------------------------------------------ */

export function ChartCard({
  title,
  subtitle,
  children,
  table,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  table?: { headers: string[]; rows: (string | number)[][] };
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
          )}
        </div>
        {table && (
          <button
            onClick={() => setShowTable((v) => !v)}
            className="shrink-0 rounded-lg border border-border p-1.5 text-muted transition-colors hover:border-gold hover:text-gold"
            aria-label={
              showTable ? "Afficher le graphique" : "Afficher le tableau"
            }
            title={showTable ? "Afficher le graphique" : "Afficher le tableau"}
          >
            <Table2 className="h-4 w-4" />
          </button>
        )}
      </header>

      {showTable && table ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                {table.headers.map((h) => (
                  <th key={h} className="pb-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[font-variant-numeric:tabular-nums]">
              {table.rows.map((row, i) => (
                <tr key={i} className="border-t border-border">
                  {row.map((cell, j) => (
                    <td key={j} className="py-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Anneau — répartition en un coup d'œil, 6 segments maximum           */
/* ------------------------------------------------------------------ */

export function DonutChart({
  data,
  centerLabel,
  formatValue,
}: {
  data: Slice[];
  centerLabel?: string;
  formatValue?: (n: number) => string;
}) {
  const nf = useNumberFormat();
  const fmt = formatValue ?? ((n: number) => nf.format(n));
  const [hovered, setHovered] = useState<number | null>(null);

  const total = data.reduce((s, d) => s + d.value, 0);
  const shown = data.filter((d) => d.value > 0);

  if (total === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted">
        Aucune donnée à afficher.
      </p>
    );
  }

  const R = 62;
  const STROKE = 22;
  const C = 2 * Math.PI * R;
  // Écart de 2px entre segments : la séparation se fait par le fond, pas par
  // un contour dessiné autour de chaque part.
  const GAP = 2;

  // Le décalage de chaque segment est la somme des fractions qui le
  // précèdent : calculé par `reduce` plutôt qu'avec une variable mutée
  // pendant le rendu.
  const arcs = shown.reduce<
    {
      label: string;
      value: number;
      color: string;
      dash: string;
      offset: number;
      percent: number;
      index: number;
    }[]
  >((acc, d, i) => {
    const consumed = acc.reduce((s, a) => s + (a.percent / 100) * C, 0);
    const fraction = d.value / total;
    const length = Math.max(fraction * C - GAP, 0.5);
    acc.push({
      label: d.label,
      value: d.value,
      color: VIZ_SLOTS[i % VIZ_SLOTS.length],
      dash: `${length} ${C - length}`,
      offset: -consumed,
      percent: fraction * 100,
      index: i,
    });
    return acc;
  }, []);

  const active = hovered != null ? arcs[hovered] : null;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0">
        <svg width={160} height={160} viewBox="0 0 160 160" role="img">
          <title>Répartition</title>
          <g transform="rotate(-90 80 80)">
            {arcs.map((a) => (
              <circle
                key={a.label}
                cx={80}
                cy={80}
                r={R}
                fill="none"
                stroke={a.color}
                strokeWidth={hovered === a.index ? STROKE + 5 : STROKE}
                strokeDasharray={a.dash}
                strokeDashoffset={a.offset}
                className="transition-[stroke-width,opacity] duration-200"
                opacity={hovered == null || hovered === a.index ? 1 : 0.35}
                onMouseEnter={() => setHovered(a.index)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              />
            ))}
          </g>
        </svg>

        {/* Le centre porte la valeur : lisible sans survol. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold">
            {active ? fmt(active.value) : fmt(total)}
          </span>
          <span className="max-w-24 text-[11px] leading-tight text-muted">
            {active ? active.label : (centerLabel ?? "Total")}
          </span>
        </div>
      </div>

      {/* Légende toujours présente, avec valeurs : l'identité ne repose
          jamais sur la couleur seule. */}
      <ul className="min-w-0 flex-1 space-y-1.5">
        {arcs.map((a) => (
          <li
            key={a.label}
            onMouseEnter={() => setHovered(a.index)}
            onMouseLeave={() => setHovered(null)}
            className={`flex items-center gap-2.5 rounded-lg px-2 py-1 text-sm transition-colors ${
              hovered === a.index ? "bg-surface-2" : ""
            }`}
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: a.color }}
            />
            <span className="min-w-0 flex-1 truncate">{a.label}</span>
            <span className="shrink-0 [font-variant-numeric:tabular-nums]">
              {fmt(a.value)}
            </span>
            <span className="w-11 shrink-0 text-right text-xs text-muted [font-variant-numeric:tabular-nums]">
              {a.percent.toFixed(0)} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Barres horizontales — classement, une seule série donc une couleur  */
/* ------------------------------------------------------------------ */

export function BarList({
  data,
  formatValue,
}: {
  data: Slice[];
  formatValue?: (n: number) => string;
}) {
  const nf = useNumberFormat();
  const fmt = formatValue ?? ((n: number) => nf.format(n));

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted">
        Aucune donnée à afficher.
      </p>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{d.label}</span>
            <span className="shrink-0 font-medium [font-variant-numeric:tabular-nums]">
              {fmt(d.value)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            {/* Une série = une couleur. Un dégradé par valeur ré-encoderait
                la longueur de la barre, information déjà portée par la barre. */}
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${Math.max((d.value / max) * 100, 1.5)}%`,
                background: VIZ_SLOTS[0],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Aire temporelle — une série, curseur de lecture au survol           */
/* ------------------------------------------------------------------ */

export type Point = { label: string; value: number };

export function AreaChart({
  data,
  formatValue,
  height = 200,
}: {
  data: Point[];
  formatValue?: (n: number) => string;
  height?: number;
}) {
  const gradientId = useId();
  const nf = useNumberFormat();
  const fmt = formatValue ?? ((n: number) => nf.format(n));
  const [active, setActive] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted">
        Aucune donnée sur la période.
      </p>
    );
  }

  const W = 600;
  const H = height;
  const PAD = { top: 16, right: 12, bottom: 28, left: 12 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;

  const x = (i: number) => PAD.left + i * stepX;
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;

  const line = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const area =
    `${PAD.left},${PAD.top + plotH} ` + line + ` ${x(data.length - 1)},${PAD.top + plotH}`;

  // Quatre repères horizontaux suffisent : la grille reste discrète.
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  const point = active != null ? data[active] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        role="img"
        onMouseLeave={() => setActive(null)}
      >
        <title>Évolution sur la période</title>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--viz-1)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--viz-1)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grille en filet plein — jamais en pointillés, qui se lisent
            comme un seuil ou une projection. */}
        {ticks.map((t) => (
          <line
            key={t}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + plotH * t}
            y2={PAD.top + plotH * t}
            stroke="var(--viz-grid)"
            strokeWidth={1}
          />
        ))}

        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline
          points={line}
          fill="none"
          stroke="var(--viz-1)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Curseur de lecture */}
        {point && (
          <line
            x1={x(active!)}
            x2={x(active!)}
            y1={PAD.top}
            y2={PAD.top + plotH}
            stroke="var(--viz-axis)"
            strokeWidth={1}
          />
        )}

        {data.map((d, i) => (
          <g key={d.label}>
            {/* Zone de survol large : viser un point de 8px au pixel près
                serait impraticable. */}
            <rect
              x={x(i) - stepX / 2}
              y={PAD.top}
              width={Math.max(stepX, 24)}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setActive(i)}
              style={{ cursor: "crosshair" }}
            />
            {active === i && (
              <circle
                cx={x(i)}
                cy={y(d.value)}
                r={5}
                fill="var(--viz-1)"
                stroke="var(--surface)"
                strokeWidth={2}
              />
            )}
          </g>
        ))}

        {/* Étiquettes d'axe : premier, milieu, dernier — pas une valeur
            sous chaque point. */}
        {[0, Math.floor((data.length - 1) / 2), data.length - 1]
          .filter((i, idx, arr) => arr.indexOf(i) === idx && data[i])
          .map((i) => (
            <text
              key={i}
              x={x(i)}
              y={H - 8}
              textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
              className="fill-[var(--muted)] text-[10px] [font-variant-numeric:tabular-nums]"
            >
              {data[i].label}
            </text>
          ))}
      </svg>

      {point && (
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs shadow-lg">
          <span className="text-muted">{point.label} · </span>
          <span className="font-semibold">{fmt(point.value)}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sparkline — tendance dans une tuile, sans axe ni étiquette          */
/* ------------------------------------------------------------------ */

export function Sparkline({
  values,
  color = "var(--viz-1)",
}: {
  values: number[];
  color?: string;
}) {
  if (values.length < 2) return null;

  const W = 100;
  const H = 28;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const step = W / (values.length - 1);

  const points = values
    .map((v, i) => `${i * step},${H - ((v - min) / span) * H}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-7 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
