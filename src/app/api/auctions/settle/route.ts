import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApiError, withApiErrors } from "@/lib/apiError";
import { notifyUser } from "@/lib/notify";

/// settleExpiredAuctions — équivalent de la RPC settle_expired_auctions.
///
/// Pas d'ordonnanceur de jobs intégré ici (contrairement à Parse Server) :
/// à appeler périodiquement depuis une tâche cron du VPS, ex.
///   * * * * * curl -s -X POST https://votre-domaine/api/auctions/settle \
///       -H "x-cron-secret: $CRON_SECRET"
export async function POST(request: Request) {
  return withApiErrors(async () => {
    const secret = request.headers.get("x-cron-secret");
    if (!secret || secret !== process.env.CRON_SECRET) {
      throw new ApiError(401, "Non autorisé");
    }

    const expired = await db.auction.findMany({
      where: { status: "active", endsAt: { lte: new Date() } },
      include: { product: true },
    });

    let settled = 0;
    for (const auction of expired) {
      await db.auction.update({ where: { id: auction.id }, data: { status: "ended" } });
      settled += 1;
      if (!auction.currentBidderId) continue;

      const shop = await db.shop.findUniqueOrThrow({ where: { id: auction.shopId } });

      await notifyUser({
        userId: auction.currentBidderId,
        type: "auction",
        title: "Enchère remportée ! 🎉",
        body: `Vous remportez « ${auction.product.title} » pour ${auction.currentBid} FCFA. Contactez le vendeur pour finaliser.`,
        data: { auctionId: auction.id, productId: auction.productId },
        actionUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/play/product/${auction.productId}`,
        actionLabel: "Voir le produit",
      });
      await notifyUser({
        userId: shop.ownerId,
        type: "auction",
        title: "Votre enchère est terminée",
        body: `« ${auction.product.title} » part à ${auction.currentBid} FCFA.`,
        data: { auctionId: auction.id, productId: auction.productId },
        actionUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/play/auctions`,
        actionLabel: "Voir mes enchères",
      });
    }

    return NextResponse.json({ settled });
  });
}
