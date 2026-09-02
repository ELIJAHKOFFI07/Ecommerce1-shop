import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/requireAuth";
import { ApiError, withApiErrors } from "@/lib/apiError";
import { notifyUser } from "@/lib/notify";

/// makeOffer — équivalent de la RPC make_offer. Bornes (50 % à 100 % du
/// prix) et limite de 3 offres par acheteur et par produit, revérifiées ici
/// — jamais fait confiance au client.
export async function POST(request: Request) {
  return withApiErrors(async () => {
    const user = await requireUser();
    const { productId, amount } = await request.json();

    const product = await db.product.findFirst({
      where: { id: productId, status: "active" },
      include: { shop: true },
    });
    if (!product) throw new ApiError(400, "Produit indisponible");
    if (product.sellerId === user.id) throw new ApiError(403, "Vous êtes le vendeur");
    if (amount < Math.ceil(product.price * 0.5) || amount > product.price) {
      throw new ApiError(400, "Offre hors bornes (50 % à 100 % du prix)");
    }

    const count = await db.offer.count({ where: { productId, buyerId: user.id } });
    if (count >= 3) throw new ApiError(400, "Limite de 3 offres atteinte");

    const offer = await db.offer.create({
      data: { productId, buyerId: user.id, shopId: product.shopId, amount },
    });
    await notifyUser({
      userId: product.sellerId,
      type: "offer",
      title: "Nouvelle offre",
      body: `Offre de ${amount} FCFA sur « ${product.title} »`,
      data: { productId: product.id },
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/play/offers`,
      actionLabel: "Voir l'offre",
    });

    return NextResponse.json({ offerId: offer.id });
  });
}
