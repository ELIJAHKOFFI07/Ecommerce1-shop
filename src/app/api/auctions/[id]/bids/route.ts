import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireAuth";
import { withApiErrors } from "@/lib/apiError";
import { placeBid } from "@/lib/placeBid";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const user = await requireUser();
    const { id: auctionId } = await ctx.params;
    const { amount } = await request.json();
    const auction = await placeBid(user.id, auctionId, amount);
    return NextResponse.json(auction);
  });
}
