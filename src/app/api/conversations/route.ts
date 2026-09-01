import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/requireAuth";
import { ApiError, withApiErrors } from "@/lib/apiError";

/// openConversation — équivalent de la RPC open_conversation.
export async function POST(request: Request) {
  return withApiErrors(async () => {
    const user = await requireUser();
    const { sellerId, productId } = await request.json();

    if (sellerId === user.id) throw new ApiError(400, "Impossible de discuter avec soi-même");

    const conversation = await db.conversation.upsert({
      where: {
        buyerId_sellerId_productId: { buyerId: user.id, sellerId, productId: productId ?? null },
      },
      update: {},
      create: { buyerId: user.id, sellerId, productId: productId ?? null },
    });

    return NextResponse.json({ conversationId: conversation.id });
  });
}
