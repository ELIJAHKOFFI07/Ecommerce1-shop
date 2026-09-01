import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/requireAuth";
import { ApiError, withApiErrors } from "@/lib/apiError";

/// respondToOffer — équivalent de la RPC respond_to_offer.
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const user = await requireUser();
    const { id: offerId } = await ctx.params;
    const { action, counterAmount } = await request.json();

    const offer = await db.offer.findFirst({
      where: { id: offerId, shop: { ownerId: user.id } },
      include: { product: true },
    });
    if (!offer) throw new ApiError(404, "Offre introuvable");
    if (offer.status !== "pending") throw new ApiError(400, "Offre déjà traitée");

    if (action === "accepted") {
      await db.offer.update({ where: { id: offer.id }, data: { status: "accepted" } });
    } else if (action === "declined") {
      await db.offer.update({ where: { id: offer.id }, data: { status: "declined" } });
    } else if (action === "countered") {
      if (!counterAmount || counterAmount <= offer.amount || counterAmount > offer.product.price) {
        throw new ApiError(400, "Contre-offre invalide");
      }
      await db.offer.update({ where: { id: offer.id }, data: { status: "countered", counterAmount } });
    } else {
      throw new ApiError(400, "Action inconnue");
    }

    await db.notification.create({
      data: {
        userId: offer.buyerId,
        type: "offer",
        title: "Réponse à votre offre",
        body: `Votre offre sur « ${offer.product.title} » : ${action}`,
        data: { productId: offer.productId },
      },
    });

    return NextResponse.json({ ok: true });
  });
}
