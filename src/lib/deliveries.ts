import type { DeliveryStatus, PaymentMethod } from "../../prisma/generated/client";
import { db, TX } from "./db";
import { ApiError } from "./apiError";
import { move, adjustUserStock } from "./stock";
import { debitWallet } from "./wallet";

/// Retrait physique : le membre demande à retirer des produits de son stock
/// personnel au bureau. Voir docs/STOCK.md §3.
export async function createDelivery(input: {
  userId: string;
  items: { productId: string; quantity: number }[];
  recipientName?: string;
  recipientPhone?: string;
}) {
  return db.$transaction(async (tx) => {
    const merged = new Map<string, number>();
    for (const it of input.items) merged.set(it.productId, (merged.get(it.productId) ?? 0) + it.quantity);

    // On vérifie que le membre possède bien ces quantités, mais on ne les
    // réserve pas : c'est la remise effective (DELIVERED) qui décrémente.
    // Une demande en attente + une autre demande sur le même stock seront
    // arbitrées au moment de la remise.
    const stocks = await tx.userStock.findMany({ where: { userId: input.userId, productId: { in: [...merged.keys()] } } });
    for (const [productId, qty] of merged) {
      const have = stocks.find((s) => s.productId === productId)?.quantity ?? 0;
      if (have < qty) throw new ApiError(400, `Vous ne possédez que ${have} unité(s) de ce produit.`);
    }
    return tx.delivery.create({
      data: {
        userId: input.userId,
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
        items: { create: [...merged].map(([productId, quantity]) => ({ productId, quantity })) },
      },
      include: { items: { include: { product: { select: { title: true } } } } },
    });
  }, TX);
}

const TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["DELIVERED", "REJECTED"],
  DELIVERED: [],
  REJECTED: [],
};

export async function transitionDelivery(input: { deliveryId: string; status: DeliveryStatus; rejectionReason?: string; adminId: string }) {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Delivery" WHERE "id" = ${input.deliveryId}::uuid FOR UPDATE`;
    if (!rows[0]) throw new ApiError(404, "Retrait introuvable.");
    const d = await tx.delivery.findUnique({ where: { id: input.deliveryId }, include: { items: true } });
    if (!d) throw new ApiError(404, "Retrait introuvable.");
    if (!TRANSITIONS[d.status].includes(input.status)) {
      throw new ApiError(400, `Passage de « ${d.status} » à « ${input.status} » impossible.`);
    }
    if (input.status === "DELIVERED") {
      // La TVA doit être réglée avant remise si elle a été fixée.
      if (d.tva && Number(d.tva) > 0 && !d.tvaPaid) {
        throw new ApiError(400, "La TVA de ce retrait n'est pas encore payée.");
      }
      for (const it of d.items) {
        await adjustUserStock(tx, d.userId, it.productId, -it.quantity);
        await move(tx, { productId: it.productId, location: "BUREAU", quantity: -it.quantity, reason: "SALE", note: `Retrait ${d.id.slice(0, 8)} remis`, userId: input.adminId });
      }
    }
    return tx.delivery.update({
      where: { id: d.id },
      data: {
        status: input.status,
        rejectionReason: input.status === "REJECTED" ? input.rejectionReason : d.rejectionReason,
        approvedAt: input.status === "APPROVED" ? new Date() : d.approvedAt,
        approvedById: input.status === "APPROVED" ? input.adminId : d.approvedById,
        deliveredAt: input.status === "DELIVERED" ? new Date() : d.deliveredAt,
        deliveredById: input.status === "DELIVERED" ? input.adminId : d.deliveredById,
      },
    });
  }, TX);
}

export async function setDeliveryTva(input: { deliveryId: string; tva: number | null }) {
  const d = await db.delivery.findUnique({ where: { id: input.deliveryId }, select: { tvaPaid: true } });
  if (!d) throw new ApiError(404, "Retrait introuvable.");
  if (d.tvaPaid) throw new ApiError(400, "La TVA est déjà payée, son montant ne peut plus changer.");
  return db.delivery.update({ where: { id: input.deliveryId }, data: { tva: input.tva } });
}

/// Paiement de la TVA. Depuis le portefeuille : débit atomique vers le
/// solde taxe. Autre moyen (espèces, mobile money) : simple marquage.
export async function payDeliveryTva(input: { deliveryId: string; paymentMethod: PaymentMethod; adminId: string }) {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Delivery" WHERE "id" = ${input.deliveryId}::uuid FOR UPDATE`;
    if (!rows[0]) throw new ApiError(404, "Retrait introuvable.");
    const d = await tx.delivery.findUnique({ where: { id: input.deliveryId } });
    if (!d) throw new ApiError(404, "Retrait introuvable.");
    if (d.tvaPaid) throw new ApiError(400, "La TVA est déjà payée.");
    if (!d.tva || Number(d.tva) <= 0) throw new ApiError(400, "Aucune TVA fixée sur ce retrait.");
    if (input.paymentMethod === "WALLET") {
      const ref = `TVA-${d.id.slice(0, 8).toUpperCase()}`;
      await debitWallet(tx, { userId: d.userId, amount: Number(d.tva), referenceId: ref, description: `Paiement TVA retrait ${ref}`, destination: "TAX" });
    }
    return tx.delivery.update({ where: { id: d.id }, data: { tvaPaid: true, tvaPaymentMethod: input.paymentMethod } });
  }, TX);
}
