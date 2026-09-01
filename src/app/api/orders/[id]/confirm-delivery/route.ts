import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/requireAuth";
import { ApiError, withApiErrors } from "@/lib/apiError";
import { applyOrderTransition } from "@/lib/orderTransition";

/// confirmDelivery — équivalent de la RPC confirm_delivery.
///
/// Passe-plat volontaire : contrôle l'appartenance, l'état "shipped" et le
/// code de retrait, puis délègue les effets à applyOrderTransition (même
/// logique que status/route.ts, jamais dupliquée). Le code n'est jamais
/// renvoyé par aucune autre route — OrderPickupCode n'est lu qu'ici.
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const user = await requireUser();
    const { id: orderId } = await ctx.params;
    const { code } = await request.json();

    const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { shop: true } });
    if (order.shop.ownerId !== user.id) throw new ApiError(403, "Commande d'une autre boutique");
    if (order.status !== "shipped") throw new ApiError(400, "La commande doit être expédiée d'abord");

    const stored = await db.orderPickupCode.findUnique({ where: { orderId } });
    if (!stored || stored.code !== String(code).trim()) {
      throw new ApiError(400, "Code de retrait incorrect");
    }

    await db.$transaction((tx) =>
      applyOrderTransition(tx, order, "delivered", "Livraison confirmée par code de retrait", "seller"),
    );

    return NextResponse.json({ ok: true });
  });
}
