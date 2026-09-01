import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/requireAuth";
import { ApiError, withApiErrors } from "@/lib/apiError";

/// createAuction — équivalent de la RPC create_auction.
export async function POST(request: Request) {
  return withApiErrors(async () => {
    const user = await requireUser();
    const { productId, startingPrice, durationHours } = await request.json();

    if (startingPrice < 100) throw new ApiError(400, "Prix de départ minimum : 100 FCFA");
    if (![24, 72, 168].includes(durationHours)) throw new ApiError(400, "Durée invalide (24, 72 ou 168 h)");

    const product = await db.product.findFirst({
      where: { id: productId, status: "active", shop: { ownerId: user.id } },
    });
    if (!product) throw new ApiError(400, "Produit introuvable");

    const already = await db.auction.findFirst({ where: { productId, status: "active" } });
    if (already) throw new ApiError(400, "Une enchère est déjà en cours sur ce produit");

    const auction = await db.auction.create({
      data: {
        productId,
        shopId: product.shopId,
        startingPrice,
        status: "active",
        endsAt: new Date(Date.now() + durationHours * 3600 * 1000),
      },
    });

    return NextResponse.json(auction);
  });
}
