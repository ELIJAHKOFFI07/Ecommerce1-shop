import type { StockMovementReason } from "../../prisma/generated/client";
import { db, TX, type Tx } from "./db";
import { ApiError } from "./apiError";

/// Mouvements de stock. Chaque changement passe par `move()` : il met à
/// jour `Product.stock` ET écrit la ligne StockMovement, sous verrou
/// FOR UPDATE. Aucun autre code ne touche `stock` directement — c'est ce
/// qui garantit que l'historique reflète la réalité et que deux
/// confirmations simultanées ne vendent pas la même unité deux fois.
export async function lockProduct(tx: Tx, productId: string) {
  const rows = await tx.$queryRaw<{ id: string; title: string; stock: number; active: boolean }[]>`
    SELECT "id", "title", "stock", "active" FROM "Product" WHERE "id" = ${productId}::uuid FOR UPDATE`;
  const p = rows[0];
  if (!p) throw new ApiError(404, "Produit introuvable.");
  return p;
}

export async function move(
  tx: Tx,
  input: { productId: string; quantity: number; reason: StockMovementReason; note?: string; userId?: string | null },
) {
  if (!Number.isInteger(input.quantity) || input.quantity === 0) throw new ApiError(400, "Quantité invalide.");
  const p = await lockProduct(tx, input.productId);
  const next = p.stock + input.quantity;
  if (next < 0) throw new ApiError(400, `Stock insuffisant pour « ${p.title} » (disponible : ${p.stock}, demandé : ${-input.quantity}).`);
  await tx.product.update({ where: { id: p.id }, data: { stock: next } });
  await tx.stockMovement.create({ data: { productId: p.id, quantity: input.quantity, reason: input.reason, note: input.note, userId: input.userId ?? null } });
  return next;
}

/// Ajustement manuel (admin) : entrée, correction, perte, retour.
export async function adjustStock(input: { productId: string; quantity: number; reason: StockMovementReason; note?: string; userId: string }) {
  return db.$transaction((tx) => move(tx, input), TX);
}
