import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/requireAuth";
import { ApiError, withApiErrors } from "@/lib/apiError";

const COSTS: Record<number, number> = { 24: 500, 72: 1200, 168: 2500 };

/// boostProduct — équivalent de la RPC boost_product. Tarifs fixes par
/// durée, débités du portefeuille du vendeur.
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const user = await requireUser();
    const { id: productId } = await ctx.params;
    const { hours } = await request.json();

    const cost = COSTS[hours];
    if (!cost) throw new ApiError(400, "Durée invalide (24, 72 ou 168 h)");

    const product = await db.product.findFirst({ where: { id: productId, shop: { ownerId: user.id } } });
    if (!product) throw new ApiError(400, "Produit introuvable");

    const boost = await db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ balance: number }[]>(
        Prisma.sql`SELECT balance FROM "Wallet" WHERE "userId" = ${user.id}::uuid FOR UPDATE`,
      );
      if (!rows[0] || rows[0].balance < cost) throw new ApiError(400, "Solde insuffisant (portefeuille)");

      await tx.wallet.update({ where: { userId: user.id }, data: { balance: { decrement: cost } } });
      await tx.walletTransaction.create({
        data: { walletUserId: user.id, amount: -cost, kind: "withdrawal", note: "Mise en avant produit" },
      });

      return tx.productBoost.create({
        data: {
          productId,
          shopId: product.shopId,
          cost,
          endsAt: new Date(Date.now() + hours * 3600 * 1000),
        },
      });
    });

    return NextResponse.json(boost);
  });
}
