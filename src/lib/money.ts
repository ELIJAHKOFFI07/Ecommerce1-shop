import { Prisma } from "../../prisma/generated/client";

export const Decimal = Prisma.Decimal;
export type DecimalLike = Prisma.Decimal | number | string;

export const dec = (v: DecimalLike) => new Prisma.Decimal(v);

/// Format monétaire unique de l'app : « 18 000 F ». Espace fine insécable
/// entre les milliers, pas de décimales (le FCFA n'en a pas en pratique).
export function formatFcfa(v: DecimalLike | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "number" ? v : Number(v.toString());
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} F`;
}

export const toNumber = (v: DecimalLike | null | undefined): number =>
  v === null || v === undefined ? 0 : typeof v === "number" ? v : Number(v.toString());
