import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { withApiErrors } from "@/lib/apiError";

/// registerProductView — équivalent de la RPC register_product_view.
/// Publique : un visiteur non connecté fait aussi avancer le compteur de
/// vues, seul "récemment consulté" a besoin d'un compte.
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const { id: productId } = await ctx.params;
    const session = await auth();

    await db.product.update({ where: { id: productId }, data: { viewsCount: { increment: 1 } } });

    if (session?.user?.id) {
      await db.recentlyViewed.upsert({
        where: { userId_productId: { userId: session.user.id, productId } },
        update: { viewedAt: new Date() },
        create: { userId: session.user.id, productId },
      });
    }

    return NextResponse.json({ ok: true });
  });
}
