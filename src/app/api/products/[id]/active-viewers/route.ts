import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withApiErrors } from "@/lib/apiError";

/// activeViewers — équivalent de la RPC active_viewers.
/// « X personnes regardent », fenêtre de 10 minutes sur RecentlyViewed.
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const { id: productId } = await ctx.params;
    const since = new Date(Date.now() - 10 * 60 * 1000);

    const count = await db.recentlyViewed.count({
      where: { productId, viewedAt: { gt: since } },
    });

    return NextResponse.json({ count });
  });
}
