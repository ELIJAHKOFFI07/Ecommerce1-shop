import { db } from "./db";

/// Comptabilité d'une boutique : ventes = commandes LIVRÉES (encaissées),
/// commandes en cours = confirmées/expédiées, paiements Mobile Money à
/// vérifier. Tout est calculé depuis les tables métier.
export type Period = { from: Date; to: Date };

export function monthRange(ym?: string): Period {
  const now = new Date();
  const [y, m] = ym && /^\d{4}-\d{2}$/.test(ym) ? ym.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  return { from: new Date(y!, m! - 1, 1), to: new Date(y!, m!, 1) };
}

export async function summary(p: Period) {
  const delivered = { status: "DELIVERED" as const, deliveredAt: { gte: p.from, lt: p.to } };
  const [sales, salesCount, inProgress, cancelled, unpaidMobile, itemsSold, topProducts] = await Promise.all([
    db.order.aggregate({ where: delivered, _sum: { subTotal: true, shippingFee: true, total: true } }),
    db.order.count({ where: delivered }),
    db.order.aggregate({ where: { status: { in: ["CONFIRMED", "SHIPPED"] } }, _sum: { total: true }, _count: true }),
    db.order.count({ where: { status: "CANCELLED", updatedAt: { gte: p.from, lt: p.to } } }),
    db.order.count({ where: { paymentMethod: "MOBILE_MONEY", paymentStatus: "UNPAID", status: { notIn: ["CANCELLED"] } } }),
    db.orderItem.aggregate({ where: { order: delivered }, _sum: { quantity: true } }),
    db.orderItem.groupBy({ by: ["productId", "title"], where: { order: delivered }, _sum: { quantity: true, totalPrice: true }, orderBy: { _sum: { totalPrice: "desc" } }, take: 8 }),
  ]);
  return {
    sales: { count: salesCount, subTotal: Number(sales._sum.subTotal ?? 0), shipping: Number(sales._sum.shippingFee ?? 0), total: Number(sales._sum.total ?? 0), items: itemsSold._sum.quantity ?? 0 },
    inProgress: { count: inProgress._count, total: Number(inProgress._sum.total ?? 0) },
    cancelled,
    unpaidMobile,
    topProducts: topProducts.map((t) => ({ productId: t.productId, title: t.title, quantity: t._sum.quantity ?? 0, total: Number(t._sum.totalPrice ?? 0) })),
  };
}

export async function monthly(months = 12) {
  const rows = await db.$queryRaw<{ ym: string; count: number; total: string; shipping: string }[]>`
    SELECT to_char(date_trunc('month', "deliveredAt"), 'YYYY-MM') AS ym, count(*)::int AS count,
           coalesce(sum("total"), 0)::text AS total, coalesce(sum("shippingFee"), 0)::text AS shipping
    FROM "Order" WHERE "status" = 'DELIVERED' AND "deliveredAt" >= date_trunc('month', now()) - make_interval(months => ${months - 1})
    GROUP BY 1 ORDER BY 1 DESC`;
  return rows.map((r) => ({ ym: r.ym, count: r.count, total: Number(r.total), shipping: Number(r.shipping) }));
}

export async function ledger(p: Period, take = 500) {
  return db.order.findMany({
    where: { createdAt: { gte: p.from, lt: p.to } },
    select: { id: true, orderNumber: true, status: true, paymentMethod: true, paymentStatus: true, total: true, createdAt: true, deliveredAt: true, user: { select: { name: true, email: true } } },
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
