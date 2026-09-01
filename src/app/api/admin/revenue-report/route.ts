import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";
import { withApiErrors } from "@/lib/apiError";
import { loadSettings } from "@/lib/settings";

/// adminRevenueReport — équivalent de la RPC admin_revenue_report.
export async function GET(request: Request) {
  return withApiErrors(async () => {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const from = new Date(searchParams.get("from") ?? 0);
    const to = new Date(searchParams.get("to") ?? Date.now());
    const { commissionPercent } = await loadSettings();

    const rows = await db.$queryRaw<{ day: Date; ordersCount: bigint; gmv: bigint }[]>`
      SELECT date_trunc('day', "createdAt") as day, count(*) as "ordersCount", coalesce(sum(total), 0) as gmv
      FROM "Order"
      WHERE status = 'delivered' AND "createdAt" BETWEEN ${from} AND ${to}
      GROUP BY day
      ORDER BY day
    `;

    return NextResponse.json(
      rows.map((r) => {
        const gmv = Number(r.gmv);
        return {
          day: r.day,
          ordersCount: Number(r.ordersCount),
          gmv,
          commission: Math.floor((gmv * commissionPercent) / 100),
        };
      }),
    );
  });
}
