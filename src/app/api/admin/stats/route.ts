import { db } from "@/lib/db";
import { withApi, ok } from "@/lib/apiError";
import { requireStaff } from "@/lib/requireAuth";

/// Tableau de bord : les chiffres qui comptent, rien de plus.
export const GET = withApi(async () => {
  await requireStaff();
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [members, pendingOrders, pendingDeliveries, validated30, lowStock, settings, revenue30] = await Promise.all([
    db.user.count({ where: { role: "CLIENT" } }),
    db.order.count({ where: { status: "PENDING" } }),
    db.delivery.count({ where: { status: { in: ["PENDING", "APPROVED"] } } }),
    db.order.count({ where: { status: "VALIDATED", validatedAt: { gte: since30 } } }),
    db.product.findMany({
      where: { active: true },
      select: { id: true, title: true, stockBureau: true, stockDisponible: true, lowStockAlert: true },
      orderBy: { stockDisponible: "asc" },
      take: 50,
    }),
    db.settings.findUnique({ where: { id: 1 }, select: { generalBalance: true, taxBalance: true } }),
    db.order.aggregate({ where: { status: { in: ["VALIDATED", "DELIVERED"] }, validatedAt: { gte: since30 } }, _sum: { total: true } }),
  ]);
  return ok({
    members,
    pendingOrders,
    pendingDeliveries,
    validated30,
    revenue30: revenue30._sum.total ?? 0,
    lowStock: lowStock.filter((p) => p.stockDisponible <= p.lowStockAlert),
    generalBalance: settings?.generalBalance ?? 0,
    taxBalance: settings?.taxBalance ?? 0,
  });
});
