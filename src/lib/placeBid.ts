import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/apiError";
import { TRANSACTION_OPTIONS } from "@/lib/transactionOptions";

/// placeBid — équivalent de la RPC place_bid. Extraite du Route Handler
/// pour être testable directement.
///
/// `FOR UPDATE` verrouille la ligne Auction pour la durée de la transaction :
/// deux mises simultanées sur la même enchère sont sérialisées par Postgres
/// lui-même. C'est exactement ce qui manquait côté Parse (Mongo, pas de
/// verrou de ligne) et qui avait nécessité un verrou en mémoire par process
/// (parse-server/cloud/lock.js) — plus la peine ici.
export async function placeBid(userId: string, auctionId: string, amount: number) {
  const result = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      {
        id: string;
        productId: string;
        shopId: string;
        currentBid: number | null;
        startingPrice: number;
        status: string;
        endsAt: Date;
        currentBidderId: string | null;
      }[]
    >(
      Prisma.sql`SELECT id, "productId", "shopId", "currentBid", "startingPrice", status, "endsAt", "currentBidderId" FROM "Auction" WHERE id = ${auctionId}::uuid FOR UPDATE`,
    );
    const auction = rows[0];
    if (!auction) throw new ApiError(404, "Enchère introuvable");
    if (auction.status !== "active" || auction.endsAt <= new Date()) {
      throw new ApiError(400, "Enchère terminée");
    }

    const shop = await tx.shop.findUniqueOrThrow({ where: { id: auction.shopId } });
    if (shop.ownerId === userId) throw new ApiError(403, "Vous êtes le vendeur");

    const min = auction.currentBid ? Math.ceil(auction.currentBid * 1.05) : auction.startingPrice;
    if (amount < min) throw new ApiError(400, `Enchère minimum : ${min} FCFA`);

    const previousBidderId = auction.currentBidderId;

    await tx.bid.create({ data: { auctionId, bidderId: userId, amount } });

    const remaining = auction.endsAt.getTime() - Date.now();
    const extend = remaining < 2 * 60 * 1000;

    const updated = await tx.auction.update({
      where: { id: auctionId },
      data: {
        currentBid: amount,
        currentBidderId: userId,
        bidsCount: { increment: 1 },
        endsAt: extend ? new Date(Date.now() + 2 * 60 * 1000) : undefined,
      },
    });

    return { updated, previousBidderId, productId: auction.productId };
  }, TRANSACTION_OPTIONS);

  if (result.previousBidderId && result.previousBidderId !== userId) {
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

  return result.updated;
}
