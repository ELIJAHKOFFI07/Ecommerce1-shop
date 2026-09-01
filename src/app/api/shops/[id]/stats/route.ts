import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withApiErrors } from "@/lib/apiError";

/// shopStats — équivalent de la RPC shop_stats.
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const { id: shopId } = await ctx.params;

    const [delivered, pendingOrders, activeProducts, reviews, followersCount] = await Promise.all([
      db.order.findMany({ where: { shopId, status: "delivered" }, select: { total: true } }),
      db.order.count({ where: { shopId, status: { in: ["pending", "confirmed", "preparing", "shipped"] } } }),
      db.product.count({ where: { shopId, status: "active" } }),
      db.review.findMany({ where: { shopId }, select: { rating: true } }),
      db.follow.count({ where: { shopId } }),
    ]);

    const totalSales = delivered.reduce((sum, o) => sum + o.total, 0);
    const averageRating = reviews.length
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : 0;

    return NextResponse.json({
      totalSales,
      deliveredOrders: delivered.length,
      pendingOrders,
      activeProducts,
      averageRating,
      ratingCount: reviews.length,
      followersCount,
    });
  });
}
