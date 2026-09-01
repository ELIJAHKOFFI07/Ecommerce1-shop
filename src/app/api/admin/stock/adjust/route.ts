import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";
import { ApiError, withApiErrors } from "@/lib/apiError";

/// adminAdjustStock — équivalent de la RPC admin_adjust_stock.
export async function POST(request: Request) {
  return withApiErrors(async () => {
    const admin = await requireAdmin();
    const { productId, variantId, delta, reason } = await request.json();

    if (!delta) throw new ApiError(400, "Ajustement nul");
    if (!reason?.trim()) throw new ApiError(400, "Motif requis");

    const newStock = await db.$transaction(async (tx) => {
      let stock: number;
      if (variantId) {
        const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: variantId } });
        stock = Math.max(0, variant.stock + delta);
        await tx.productVariant.update({ where: { id: variantId }, data: { stock } });
      } else {
        const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });
        stock = Math.max(0, product.stock + delta);
        await tx.product.update({ where: { id: productId }, data: { stock } });
      }

      await tx.stockMovement.create({
        data: { productId, variantId, delta, reason, createdById: admin.id },
      });

      return stock;
    });

    return NextResponse.json({ stock: newStock });
  });
}
