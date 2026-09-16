import { randomInt } from "node:crypto";
import type { Tx } from "./db";

/// Numéro de membre : SL-XXXXXX (6 chiffres aléatoires). Aléatoire plutôt
/// que séquentiel : un numéro séquentiel révèle le nombre de membres et
/// permet d'énumérer les comptes. On réessaie en cas de collision.
export async function nextMemberNumber(tx: Tx): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const candidate = `SL-${randomInt(100000, 999999)}`;
    const exists = await tx.user.findUnique({ where: { memberNumber: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  throw new Error("Impossible de générer un numéro de membre unique");
}

/// Numéro de commande : CMD-AAAAMMJJ-NNNN. Le compteur du jour est lu sous
/// verrou consultatif pour que deux commandes simultanées ne reçoivent pas
/// le même numéro.
export async function nextOrderNumber(tx: Tx): Promise<string> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(4242)`;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const count = await tx.order.count({ where: { createdAt: { gte: start, lt: end } } });
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `CMD-${ymd}-${String(count + 1).padStart(4, "0")}`;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
