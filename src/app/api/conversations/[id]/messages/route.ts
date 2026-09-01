import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/requireAuth";
import { ApiError, withApiErrors } from "@/lib/apiError";

/// Envoi de message — géré côté Supabase par une simple policy RLS
/// (messages_insert) puisque le client écrivait directement dans la table ;
/// sans RLS, c'est cette route qui porte désormais le contrôle
/// d'appartenance et de blocage.
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const user = await requireUser();
    const { id: conversationId } = await ctx.params;
    const { content } = await request.json();

    if (typeof content !== "string" || !content.trim()) {
      throw new ApiError(400, "Message vide");
    }

    const conversation = await db.conversation.findUniqueOrThrow({ where: { id: conversationId } });
    if (conversation.buyerId !== user.id && conversation.sellerId !== user.id) {
      throw new ApiError(403, "Conversation inaccessible");
    }
    const otherId = conversation.buyerId === user.id ? conversation.sellerId : conversation.buyerId;

    const blocked = await db.block.findFirst({
      where: { blockerId: otherId, blockedId: user.id },
    });
    if (blocked) throw new ApiError(403, "Envoi impossible");

    const message = await db.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId, senderId: user.id, content: content.trim() },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessage: content.trim().slice(0, 120), lastMessageAt: created.createdAt },
      });
      await tx.notification.create({
        data: {
          userId: otherId,
          type: "message",
          title: "Nouveau message",
          body: content.trim().slice(0, 120),
          data: { conversationId },
        },
      });
      return created;
    });

    return NextResponse.json(message);
  });
}
