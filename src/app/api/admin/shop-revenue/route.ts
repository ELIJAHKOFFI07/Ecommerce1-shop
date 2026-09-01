import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";
import { withApiErrors } from "@/lib/apiError";
import { loadSettings } from "@/lib/settings";

/// adminShopRevenue — équivalent de la RPC admin_shop_revenue.
export async function GET(request: Request) {
  return withApiErrors(async () => {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const from = new Date(searchParams.get("from") ?? 0);
    const to = new Date(searchParams.get("to") ?? Date.now());
    const { commissionPercent } = await loadSettings();

    const rows = await db.$queryRaw<
      { shopId: string; shopName: string; ordersCount: bigint; gmv: bigint }[]
    >`
      SELECT s.id as "shopId", s.name as "shopName", count(o.id) as "ordersCount", coalesce(sum(o.total), 0) as gmv
      FROM "Shop" s
      JOIN "Order" o ON o."shopId" = s.id AND o.status = 'delivered' AND o."createdAt" BETWEEN ${from} AND ${to}
      GROUP BY s.id, s.name
      ORDER BY gmv DESC
    `;

    return NextResponse.json(
      rows.map((r) => {
        const gmv = Number(r.gmv);
        const commission = Math.floor((gmv * commissionPercent) / 100);
        return { ...r, ordersCount: Number(r.ordersCount), gmv, commission, payout: gmv - commission };
      }),
    );
  });
}
