import type { StockLocation, StockMovementReason } from "../../prisma/generated/client";
import { db, TX, type Tx } from "./db";
import { ApiError } from "./apiError";

/// Mouvements de stock. Chaque changement passe par `move()` : il met à
/// jour la colonne du produit ET écrit la ligne StockMovement. Aucun code
/// ailleurs ne touche `stockBureau`/`stockVirtuel`/… directement — c'est
/// ce qui garantit que l'historique reflète la réalité.
///
/// Règle du signe : `quantity` > 0 entre, < 0 sort. Un stock ne peut pas
/// devenir négatif, SAUF stockDisponible (ventes anticipées autorisées,
/// comme dans Superlife) et stockVirtuel via `allowNegative`.

const COLUMN: Record<StockLocation, "stockVirtuel" | "stockDisponible" | "stockBureau" | "stockEntrepot"> = {
  VIRTUEL: "stockVirtuel",
  DISPONIBLE: "stockDisponible",
  BUREAU: "stockBureau",
  ENTREPOT: "stockEntrepot",
};

export const LOCATION_LABEL: Record<StockLocation, string> = {
  VIRTUEL: "Stock virtuel",
  DISPONIBLE: "Stock disponible",
  BUREAU: "Stock bureau",
  ENTREPOT: "Stock entrepôt",
};

export async function lockProduct(tx: Tx, productId: string) {
  const rows = await tx.$queryRaw<
    { id: string; title: string; stockVirtuel: number; stockDisponible: number; stockBureau: number; stockEntrepot: number }[]
  >`SELECT "id","title","stockVirtuel","stockDisponible","stockBureau","stockEntrepot" FROM "Product" WHERE "id" = ${productId}::uuid FOR UPDATE`;
  const p = rows[0];
  if (!p) throw new ApiError(404, "Produit introuvable.");
  return p;
}

export async function move(
  tx: Tx,
  input: {
    productId: string;
    location: StockLocation;
    quantity: number;
    reason: StockMovementReason;
    note?: string;
    userId?: string | null;
    allowNegative?: boolean;
  },
) {
  if (!Number.isInteger(input.quantity) || input.quantity === 0) throw new ApiError(400, "Quantité invalide.");
  const product = await lockProduct(tx, input.productId);
  const col = COLUMN[input.location];
  const next = product[col] + input.quantity;
  const negativeOk = input.allowNegative || input.location === "DISPONIBLE";
  if (next < 0 && !negativeOk) {
    throw new ApiError(400, `${LOCATION_LABEL[input.location]} insuffisant pour « ${product.title} » (disponible : ${product[col]}, demandé : ${-input.quantity}).`);
  }
  await tx.product.update({ where: { id: input.productId }, data: { [col]: next } });
  await tx.stockMovement.create({
    data: {
      productId: input.productId,
      location: input.location,
      quantity: input.quantity,
      reason: input.reason,
      note: input.note,
      userId: input.userId ?? null,
    },
  });
  return next;
}

/// Stock personnel d'un membre (produits achetés non retirés).
export async function adjustUserStock(tx: Tx, userId: string, productId: string, delta: number) {
  const rows = await tx.$queryRaw<{ quantity: number }[]>`
    SELECT "quantity" FROM "UserStock" WHERE "userId" = ${userId}::uuid AND "productId" = ${productId}::uuid FOR UPDATE
  `;
  const current = rows[0]?.quantity ?? 0;
  const next = current + delta;
  if (next < 0) throw new ApiError(400, `Stock personnel insuffisant (disponible : ${current}, demandé : ${-delta}).`);
  await tx.userStock.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId, quantity: next },
    update: { quantity: next },
  });
  return next;
}

/// Transfert entre deux emplacements physiques/virtuels du même produit.
export async function transferStock(input: { productId: string; from: StockLocation; to: StockLocation; quantity: number; note?: string; userId: string }) {
  return db.$transaction(async (tx) => {
    const note = input.note ?? `Transfert ${LOCATION_LABEL[input.from]} → ${LOCATION_LABEL[input.to]}`;
    await move(tx, { productId: input.productId, location: input.from, quantity: -input.quantity, reason: "TRANSFER", note, userId: input.userId });
    await move(tx, { productId: input.productId, location: input.to, quantity: input.quantity, reason: "TRANSFER", note, userId: input.userId });
  }, TX);
}

/// Commande fournisseur — voir docs/STOCK.md §1.
export async function createSupplyOrder(input: { productId: string; quantity: number; note?: string; userId: string }) {
  return db.$transaction(async (tx) => {
    const so = await tx.supplyOrder.create({ data: { productId: input.productId, quantity: input.quantity, note: input.note, createdById: input.userId } });
    await move(tx, { productId: input.productId, location: "VIRTUEL", quantity: input.quantity, reason: "RECEPTION", note: `Commande fournisseur ${so.id.slice(0, 8)}`, userId: input.userId });
    return so;
  }, TX);
}

export async function receiveSupplyOrder(input: { id: string; quantityBureau: number; quantityEntrepot: number; userId: string }) {
  return db.$transaction(async (tx) => {
    const so = await tx.supplyOrder.findUnique({ where: { id: input.id } });
    if (!so) throw new ApiError(404, "Commande fournisseur introuvable.");
    if (so.status !== "PENDING") throw new ApiError(400, "Cette commande fournisseur est déjà traitée.");
    const total = input.quantityBureau + input.quantityEntrepot;
    if (total !== so.quantity) throw new ApiError(400, `La répartition (${total}) doit égaler la quantité commandée (${so.quantity}).`);
    const note = `Réception fournisseur ${so.id.slice(0, 8)}`;
    if (input.quantityBureau > 0) await move(tx, { productId: so.productId, location: "BUREAU", quantity: input.quantityBureau, reason: "RECEPTION", note, userId: input.userId });
    if (input.quantityEntrepot > 0) await move(tx, { productId: so.productId, location: "ENTREPOT", quantity: input.quantityEntrepot, reason: "RECEPTION", note, userId: input.userId });
    await move(tx, { productId: so.productId, location: "DISPONIBLE", quantity: total, reason: "RECEPTION", note, userId: input.userId });
    return tx.supplyOrder.update({
      where: { id: so.id },
      data: { status: "RECEIVED", quantityBureau: input.quantityBureau, quantityEntrepot: input.quantityEntrepot, receivedById: input.userId, receivedAt: new Date() },
    });
  }, TX);
}

export async function cancelSupplyOrder(input: { id: string; userId: string }) {
  return db.$transaction(async (tx) => {
    const so = await tx.supplyOrder.findUnique({ where: { id: input.id } });
    if (!so) throw new ApiError(404, "Commande fournisseur introuvable.");
    if (so.status !== "PENDING") throw new ApiError(400, "Cette commande fournisseur est déjà traitée.");
    await move(tx, { productId: so.productId, location: "VIRTUEL", quantity: -so.quantity, reason: "ADJUSTMENT", note: `Annulation commande fournisseur ${so.id.slice(0, 8)}`, userId: input.userId, allowNegative: true });
    return tx.supplyOrder.update({ where: { id: so.id }, data: { status: "CANCELLED" } });
  }, TX);
}

/// Conversion : le client rend A, reçoit B. Voir docs/STOCK.md §4.
export async function convertProduct(input: { clientId: string; fromProductId: string; fromQuantity: number; toProductId: string; toQuantity: number; comment?: string; adminId: string }) {
  return db.$transaction(async (tx) => {
    const client = await tx.user.findUnique({ where: { id: input.clientId }, select: { id: true } });
    if (!client) throw new ApiError(404, "Membre introuvable.");
    // Le client doit posséder ce qu'il rend.
    await adjustUserStock(tx, input.clientId, input.fromProductId, -input.fromQuantity);
    await adjustUserStock(tx, input.clientId, input.toProductId, input.toQuantity);
    const note = `Conversion pour membre ${input.clientId.slice(0, 8)}`;
    for (const loc of ["BUREAU", "DISPONIBLE", "VIRTUEL"] as const) {
      await move(tx, { productId: input.fromProductId, location: loc, quantity: input.fromQuantity, reason: "CONVERSION", note, userId: input.adminId });
      await move(tx, { productId: input.toProductId, location: loc, quantity: -input.toQuantity, reason: "CONVERSION", note, userId: input.adminId, allowNegative: loc === "VIRTUEL" });
    }
    return tx.productConversion.create({ data: { ...input, comment: input.comment } });
  }, TX);
}
