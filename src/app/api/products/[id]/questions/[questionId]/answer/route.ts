import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/requireAuth";
import { ApiError, withApiErrors } from "@/lib/apiError";

/// answerQuestion — équivalent de la RPC answer_question.
export async function POST(request: Request, ctx: { params: Promise<{ id: string; questionId: string }> }) {
  return withApiErrors(async () => {
    const user = await requireUser();
    const { questionId } = await ctx.params;
    const { answer } = await request.json();

    const question = await db.productQuestion.findFirst({
      where: { id: questionId, product: { shop: { ownerId: user.id } } },
    });
    if (!question) throw new ApiError(403, "Non autorisé");

    await db.productQuestion.update({
      where: { id: questionId },
      data: { answer, answeredAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  });
}
