import { db } from "./db";

/// Comptabilité : les agrégats que l'administration attend.
///
/// Tout est calculé côté serveur depuis les tables métier — aucune
/// valeur n'est saisie à la main. La « vente » d'une période est la somme
/// des commandes VALIDÉES (validatedAt dans la période), pas des reçus
/// envoyés : un reçu en attente ou rejeté n'est pas une vente.
export type Period = { from: Date; to: Date };

export function monthRange(ym?: string): Period {
  const now = new Date();
  const [y, m] = ym && /^\d{4}-\d{2}$/.test(ym) ? ym.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const from = new Date(y!, m! - 1, 1);
  const to = new Date(y!, m!, 1);
  return { from, to };
}

export async function summary(p: Period) {
  const [sales, salesCount, tax, credits, transfers, deliveries, settings] = await Promise.all([
    db.order.aggregate({ where: { status: { in: ["VALIDATED", "DELIVERED"] }, validatedAt: { gte: p.from, lt: p.to } }, _sum: { subTotal: true, taxTotal: true, total: true } }),
    db.order.count({ where: { status: { in: ["VALIDATED", "DELIVERED"] }, validatedAt: { gte: p.from, lt: p.to } } }),
    db.delivery.aggregate({ where: { tvaPaid: true, deliveredAt: { gte: p.from, lt: p.to } }, _sum: { tva: true }, _count: true }),
    db.walletTransaction.aggregate({ where: { type: "CREDIT", userId: { not: null }, createdAt: { gte: p.from, lt: p.to } }, _sum: { amount: true }, _count: true }),
    db.walletTransaction.aggregate({ where: { type: "TRANSFER", userId: { not: null }, amount: { gt: 0 }, createdAt: { gte: p.from, lt: p.to } }, _sum: { amount: true }, _count: true }),
    db.delivery.count({ where: { status: "DELIVERED", deliveredAt: { gte: p.from, lt: p.to } } }),
    db.settings.findUnique({ where: { id: 1 }, select: { generalBalance: true, taxBalance: true } }),
  ]);
  const walletTotal = await db.wallet.aggregate({ _sum: { balance: true } });
  return {
    sales: { count: salesCount, subTotal: Number(sales._sum.subTotal ?? 0), tax: Number(sales._sum.taxTotal ?? 0), total: Number(sales._sum.total ?? 0) },
    taxCollected: { count: tax._count, amount: Number(tax._sum.tva ?? 0) },
    credits: { count: credits._count, amount: Number(credits._sum.amount ?? 0) },
    transfers: { count: transfers._count, amount: Number(transfers._sum.amount ?? 0) },
    deliveries,
    balances: { general: Number(settings?.generalBalance ?? 0), tax: Number(settings?.taxBalance ?? 0), members: Number(walletTotal._sum.balance ?? 0) },
  };
}

/// Douze derniers mois : ventes validées et TVA encaissée, mois par mois.
export async function monthly(months = 12) {
  const rows = await db.$queryRaw<{ ym: string; count: number; total: string; tax: string }[]>`
    SELECT to_char(date_trunc('month', "validatedAt"), 'YYYY-MM') AS ym,
           count(*)::int AS count,
           coalesce(sum("total"), 0)::text AS total,
           coalesce(sum("taxTotal"), 0)::text AS tax
    FROM "Order"
    WHERE "status" IN ('VALIDATED', 'DELIVERED') AND "validatedAt" >= date_trunc('month', now()) - make_interval(months => ${months - 1})
    GROUP BY 1 ORDER BY 1 DESC`;
  const taxRows = await db.$queryRaw<{ ym: string; amount: string }[]>`
    SELECT to_char(date_trunc('month', "deliveredAt"), 'YYYY-MM') AS ym, coalesce(sum("tva"), 0)::text AS amount
    FROM "Delivery" WHERE "tvaPaid" AND "deliveredAt" >= date_trunc('month', now()) - make_interval(months => ${months - 1})
    GROUP BY 1`;
  const taxMap = new Map(taxRows.map((r) => [r.ym, Number(r.amount)]));
  return rows.map((r) => ({ ym: r.ym, count: r.count, total: Number(r.total), tax: Number(r.tax), taxCollected: taxMap.get(r.ym) ?? 0 }));
}

/// Grand livre des mouvements d'argent (portefeuilles + caisse).
export async function ledger(p: Period, take = 500) {
  return db.walletTransaction.findMany({
    where: { createdAt: { gte: p.from, lt: p.to } },
    select: { id: true, createdAt: true, type: true, amount: true, description: true, referenceId: true, paymentMethod: true, user: { select: { name: true, memberNumber: true } }, admin: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]!);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [cols.join(";"), ...rows.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\r\n");
}
