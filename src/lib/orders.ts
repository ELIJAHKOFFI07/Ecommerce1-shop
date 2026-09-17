import type { OrderStatus } from "../../prisma/generated/client";
import { db, TX } from "./db";
import { ApiError } from "./apiError";
import { dec } from "./decimal";
import { nextOrderNumber } from "./ids";
import { move, adjustUserStock } from "./stock";

/// Création d'une commande (envoi de reçu) par un membre.
///
/// Les prix viennent EXCLUSIVEMENT du catalogue au moment de la commande.
/// Superlife acceptait un `unitPrice` fourni par le client « pour les
/// imports » — c'est une faille : n'importe qui pouvait déclarer un reçu
/// à 1 F. Ici le client n'envoie que des identifiants et des quantités.
export async function createOrder(input: {
  userId: string;
  items: { productId: string; quantity: number }[];
  claimReference: string;
  salesNo?: string;
  receiptUrl?: string;
  note?: string;
}) {
  return db.$transaction(async (tx) => {
    const settings = await tx.settings.findUnique({ where: { id: 1 }, select: { allowReceiptSending: true } });
    if (settings && !settings.allowReceiptSending) {
      throw new ApiError(403, "L'envoi des reçus est temporairement suspendu par l'administration.");
    }
    const dup = await tx.order.findUnique({ where: { claimReference: input.claimReference }, select: { id: true } });
    if (dup) throw new ApiError(409, "Ce reçu a déjà été enregistré. Vérifiez la référence.");

    // Fusion des lignes en double (même produit deux fois).
    const merged = new Map<string, number>();
    for (const it of input.items) merged.set(it.productId, (merged.get(it.productId) ?? 0) + it.quantity);

    const products = await tx.product.findMany({
      where: { id: { in: [...merged.keys()] }, active: true },
      select: { id: true, price: true, tva: true, title: true },
    });
    if (products.length !== merged.size) throw new ApiError(400, "Un des produits n'existe pas ou n'est plus disponible.");

    let subTotal = dec(0);
    let taxTotal = dec(0);
    const lines = products.map((p) => {
      const qty = merged.get(p.id)!;
      const lineTotal = dec(p.price).mul(qty);
      subTotal = subTotal.add(lineTotal);
      taxTotal = taxTotal.add(lineTotal.mul(dec(p.tva)).div(100));
      return { productId: p.id, quantity: qty, unitPrice: p.price, totalPrice: lineTotal };
    });

    const orderNumber = await nextOrderNumber(tx);
    return tx.order.create({
      data: {
        orderNumber,
        userId: input.userId,
        claimReference: input.claimReference,
        salesNo: input.salesNo,
        receiptUrl: input.receiptUrl,
        note: input.note,
        subTotal,
        taxTotal: taxTotal.toDecimalPlaces(2),
        total: subTotal.add(taxTotal).toDecimalPlaces(2),
        items: { create: lines },
      },
      include: { items: { include: { product: { select: { title: true, images: true } } } } },
    });
  }, TX);
}

/// Transitions autorisées. Une commande validée ne peut plus être rejetée
/// (le stock a bougé) : on l'annule ou on la rembourse.
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["VALIDATED", "REJECTED", "CANCELLED"],
  VALIDATED: ["DELIVERED", "CANCELLED", "REFUNDED"],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
  REJECTED: [],
};

export async function transitionOrder(input: { orderId: string; status: OrderStatus; rejectionReason?: string; adminId: string }) {
  return db.$transaction(async (tx) => {
    // Verrou sur la commande : deux admins qui valident en même temps ne
    // doivent pas décrémenter le stock deux fois.
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Order" WHERE "id" = ${input.orderId}::uuid FOR UPDATE`;
    if (!rows[0]) throw new ApiError(404, "Commande introuvable.");
    const order = await tx.order.findUnique({ where: { id: input.orderId }, include: { items: true } });
    if (!order) throw new ApiError(404, "Commande introuvable.");
    if (!TRANSITIONS[order.status].includes(input.status)) {
      throw new ApiError(400, `Passage de « ${order.status} » à « ${input.status} » impossible.`);
    }
    if (input.status === "REJECTED" && !input.rejectionReason?.trim()) {
      throw new ApiError(400, "Indiquez le motif du rejet — le membre le verra.");
    }

    // Validation : stock virtuel et disponible diminuent, stock personnel augmente.
    if (order.status === "PENDING" && input.status === "VALIDATED") {
      for (const it of order.items) {
        const note = `Validation commande ${order.orderNumber}`;
        await move(tx, { productId: it.productId, location: "VIRTUEL", quantity: -it.quantity, reason: "SALE", note, userId: input.adminId });
        await move(tx, { productId: it.productId, location: "DISPONIBLE", quantity: -it.quantity, reason: "SALE", note, userId: input.adminId });
        await adjustUserStock(tx, order.userId, it.productId, it.quantity);
      }
    }
    // Annulation/remboursement d'une commande validée : retour au stock.
    if (order.status === "VALIDATED" && (input.status === "CANCELLED" || input.status === "REFUNDED")) {
      for (const it of order.items) {
        const note = `Annulation commande ${order.orderNumber}`;
        await adjustUserStock(tx, order.userId, it.productId, -it.quantity);
        await move(tx, { productId: it.productId, location: "VIRTUEL", quantity: it.quantity, reason: "RETURN", note, userId: input.adminId });
        await move(tx, { productId: it.productId, location: "DISPONIBLE", quantity: it.quantity, reason: "RETURN", note, userId: input.adminId });
      }
    }

    return tx.order.update({
      where: { id: order.id },
      data: {
        status: input.status,
        rejectionReason: input.status === "REJECTED" ? input.rejectionReason : order.rejectionReason,
        validatedAt: input.status === "VALIDATED" ? new Date() : order.validatedAt,
      },
    });
  }, TX);
}
