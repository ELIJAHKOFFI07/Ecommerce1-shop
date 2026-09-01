import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";
import { withApiErrors } from "@/lib/apiError";

/// adminStats — équivalent de la RPC admin_stats.
export async function GET() {
  return withApiErrors(async () => {
    await requireAdmin();

    const [users, shops, products, orders, deliveredOrders, openReports] = await Promise.all([
      db.user.count(),
      db.shop.count(),
      db.product.count({ where: { status: "active" } }),
      db.order.count(),
      db.order.findMany({ where: { status: "delivered" }, select: { total: true } }),
      db.report.count({ where: { status: "open" } }),
    ]);

    const gmv = deliveredOrders.reduce((sum, o) => sum + o.total, 0);

    return NextResponse.json({ users, shops, products, orders, gmv, openReports });
  });
}
