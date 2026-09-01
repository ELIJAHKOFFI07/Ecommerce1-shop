import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/requireAuth";
import { withApiErrors } from "@/lib/apiError";

/// markConversationRead — équivalent de la RPC mark_conversation_read.
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const user = await requireUser();
    const { id: conversationId } = await ctx.params;

    const result = await db.message.updateMany({
      where: { conversationId, senderId: { not: user.id }, readAt: null },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ ok: true, count: result.count });
  });
}
