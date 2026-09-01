import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/requireAuth";
import { ApiError, withApiErrors } from "@/lib/apiError";

/// Poser une question sur un produit — écriture publique côté Supabase via
/// policy RLS (author_id = auth.uid()) ; portée ici par la route elle-même.
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const user = await requireUser();
    const { id: productId } = await ctx.params;
    const { question } = await request.json();
    if (typeof question !== "string" || !question.trim()) throw new ApiError(400, "Question vide");

    const created = await db.productQuestion.create({
      data: { productId, authorId: user.id, question: question.trim() },
    });

    return NextResponse.json(created);
  });
}
