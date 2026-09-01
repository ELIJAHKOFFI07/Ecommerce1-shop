import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/requireAuth";
import { ApiError, withApiErrors } from "@/lib/apiError";
import { applyOrderTransition, ORDER_TRANSITIONS } from "@/lib/orderTransition";
import { TRANSACTION_OPTIONS } from "@/lib/transactionOptions";

/// advanceOrderStatus — équivalent de la RPC advance_order_status.
///
/// C'est la seule machine à états : la restitution du stock à l'annulation,
/// le crédit du vendeur et les points de fidélité à la livraison passent
/// tous par applyOrderTransition (src/lib/orderTransition.ts), partagée
/// avec la route confirm-delivery — dupliquer cette logique dans les deux
/// routes serait s'exposer à ce qu'elles divergent silencieusement (déjà
/// vu trois fois côté Parse pour d'autres valeurs par défaut).
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const user = await requireUser();
    const { id: orderId } = await ctx.params;
    const { status, note } = await request.json();

    const order = await db.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { shop: true },
    });

    const isSeller = order.shop.ownerId === user.id;
    const isBuyer = order.buyerId === user.id;
    if (!isSeller && !isBuyer) throw new ApiError(403, "Accès refusé");

    // L'acheteur ne peut qu'annuler, et seulement avant expédition.
    const cancellable = order.status === "pending" || order.status === "confirmed";
    if (!isSeller && (status !== "cancelled" || !cancellable)) {
      throw new ApiError(403, "Action non autorisée");
    }

    // "delivered" n'est atteignable que par /confirm-delivery : c'est là
    // qu'est vérifié le code de retrait.
    if (status === "delivered") {
      throw new ApiError(400, "Passez par la confirmation de livraison");
    }
    if (!ORDER_TRANSITIONS[order.status]?.includes(status)) {
      throw new ApiError(400, `Transition ${order.status} → ${status} interdite`);
    }

    await db.$transaction(
      (tx) => applyOrderTransition(tx, order, status, note, isSeller ? "seller" : "buyer"),
      TRANSACTION_OPTIONS,
    );

    return NextResponse.json({ ok: true, status });
  });
}
