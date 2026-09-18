import { db } from "@/lib/db";
import { withApi, ok } from "@/lib/apiError";
import { requireStaff } from "@/lib/requireAuth";

export const GET = withApi(async () => {
  await requireStaff();
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [pending, toShip, shipped, unpaidMobile, customers, delivered30, lowStock] = await Promise.all([
    db.order.count({ where: { status: "PENDING" } }),
    db.order.count({ where: { status: "CONFIRMED" } }),
    db.order.count({ where: { status: "SHIPPED" } }),
    db.order.count({ where: { paymentMethod: "MOBILE_MONEY", paymentStatus: "UNPAID", status: { not: "CANCELLED" } } }),
    db.user.count({ where: { role: "CLIENT" } }),
    db.order.aggregate({ where: { status: "DELIVERED", deliveredAt: { gte: since30 } }, _sum: { total: true }, _count: true }),
    db.$queryRaw<{ id: string; title: string; stock: number }[]>`SELECT "id","title","stock" FROM "Product" WHERE "active" AND "stock" <= "lowStockAlert" ORDER BY "stock" ASC LIMIT 10`,
  ]);
  return ok({ pending, toShip, shipped, unpaidMobile, customers, delivered30: delivered30._count, revenue30: delivered30._sum.total ?? 0, lowStock });
});
