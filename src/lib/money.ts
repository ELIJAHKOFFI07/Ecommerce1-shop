/// Formatage monétaire — module PUR, sans import Prisma : il est utilisé
/// par les composants client et ne doit tirer aucun code serveur.
export type DecimalLike = { toString(): string } | number | string;

/// Format unique de l'app : « 18 000 F ». Pas de décimales (le FCFA n'en
/// a pas en pratique).
export function formatFcfa(v: DecimalLike | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "number" ? v : Number(v.toString());
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} F`;
}

export const toNumber = (v: DecimalLike | null | undefined): number =>
  v === null || v === undefined ? 0 : typeof v === "number" ? v : Number(v.toString());
