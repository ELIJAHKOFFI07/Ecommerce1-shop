import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/requireAuth";
import { ApiError, withApiErrors } from "@/lib/apiError";

/// placeBid — équivalent de la RPC place_bid.
///
/// `FOR UPDATE` verrouille la ligne Auction pour la durée de la transaction :
/// deux mises simultanées sur la même enchère sont sérialisées par Postgres
/// lui-même. C'est exactement ce qui manquait côté Parse (Mongo, pas de
/// verrou de ligne) et qui avait nécessité un verrou en mémoire par process
/// (parse-server/cloud/lock.js) — plus la peine ici.
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const user = await requireUser();
    const { id: auctionId } = await ctx.params;
    const { amount } = await request.json();

    const result = await db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { id: string; productId: string; shopId: string; currentBid: number | null; startingPrice: number; status: string; endsAt: Date; currentBidderId: string | null }[]
      >(Prisma.sql`SELECT id, "productId", "shopId", "currentBid", "startingPrice", status, "endsAt", "currentBidderId" FROM "Auction" WHERE id = ${auctionId}::uuid FOR UPDATE`);
      const auction = rows[0];
      if (!auction) throw new ApiError(404, "Enchère introuvable");
      if (auction.status !== "active" || auction.endsAt <= new Date()) {
        throw new ApiError(400, "Enchère terminée");
      }

      const shop = await tx.shop.findUniqueOrThrow({ where: { id: auction.shopId } });
      if (shop.ownerId === user.id) throw new ApiError(403, "Vous êtes le vendeur");

      const min = auction.currentBid ? Math.ceil(auction.currentBid * 1.05) : auction.startingPrice;
      if (amount < min) throw new ApiError(400, `Enchère minimum : ${min} FCFA`);

      const previousBidderId = auction.currentBidderId;

      await tx.bid.create({ data: { auctionId, bidderId: user.id, amount } });

      const remaining = auction.endsAt.getTime() - Date.now();
      const extend = remaining < 2 * 60 * 1000;

      const updated = await tx.auction.update({
        where: { id: auctionId },
        data: {
          currentBid: amount,
          currentBidderId: user.id,
          bidsCount: { increment: 1 },
          endsAt: extend ? new Date(Date.now() + 2 * 60 * 1000) : undefined,
        },
      });

      return { updated, previousBidderId, productId: auction.productId };
    });

    if (result.previousBidderId && result.previousBidderId !== user.id) {
      await db.notification.create({
        data: {
          userId: result.previousBidderId,
          type: "auction",
          title: "Vous avez été surenchéri !",
          body: `Nouvelle offre de ${amount} FCFA — réagissez vite.`,
          data: { auctionId, productId: result.productId },
        },
      });
    }

    return NextResponse.json(result.updated);
  });
}
