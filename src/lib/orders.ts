import type { OrderStatus, PaymentMethod } from "../../prisma/generated/client";
import { db, TX, type Tx } from "./db";
import { ApiError } from "./apiError";
import { dec } from "./decimal";
import { move } from "./stock";

/// Numéro de commande : DS-AAAAMMJJ-NNNN, compteur du jour sous verrou
/// consultatif pour que deux commandes simultanées ne se doublent pas.
async function nextOrderNumber(tx: Tx): Promise<string> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(4242)`;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const count = await tx.order.count({ where: { createdAt: { gte: start } } });
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `DS-${ymd}-${String(count + 1).padStart(4, "0")}`;
}

/// Création d'une commande. Les prix viennent EXCLUSIVEMENT du catalogue ;
/// le stock est vérifié (pas réservé) : il est décrémenté à la
/// confirmation par l'admin. L'adresse est copiée dans la commande.
export async function createOrder(input: {
  userId: string;
  items: { productId: string; quantity: number }[];
  paymentMethod: PaymentMethod;
  address: { fullName: string; phone: string; city: string; commune?: string | null; details: string };
  note?: string;
}) {
  return db.$transaction(async (tx) => {
    const merged = new Map<string, number>();
    for (const it of input.items) merged.set(it.productId, (merged.get(it.productId) ?? 0) + it.quantity);

    const products = await tx.product.findMany({
      where: { id: { in: [...merged.keys()] }, active: true },
      select: { id: true, title: true, price: true, images: true, stock: true },
    });
    if (products.length !== merged.size) throw new ApiError(400, "Un des produits n'est plus disponible.");
    for (const p of products) {
      const q = merged.get(p.id)!;
      if (p.stock < q) throw new ApiError(400, `« ${p.title} » : il ne reste que ${p.stock} unité(s).`);
    }

    const settings = await tx.settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {}, select: { shippingFee: true, freeShippingThreshold: true } });
    let subTotal = dec(0);
    const lines = products.map((p) => {
      const qty = merged.get(p.id)!;
      const total = dec(p.price).mul(qty);
      subTotal = subTotal.add(total);
      return { productId: p.id, title: p.title, image: p.images[0] ?? null, quantity: qty, unitPrice: p.price, totalPrice: total };
    });
    const free = settings.freeShippingThreshold !== null && subTotal.greaterThanOrEqualTo(settings.freeShippingThreshold);
    const shippingFee = free ? dec(0) : dec(settings.shippingFee);

    return tx.order.create({
      data: {
        orderNumber: await nextOrderNumber(tx),
        userId: input.userId,
        paymentMethod: input.paymentMethod,
        subTotal,
        shippingFee,
        total: subTotal.add(shippingFee),
        shipFullName: input.address.fullName,
        shipPhone: input.address.phone,
        shipCity: input.address.city,
        shipCommune: input.address.commune ?? null,
        shipDetails: input.address.details,
        note: input.note,
        items: { create: lines },
      },
      include: { items: true },
    });
  }, TX);
}

/// Transitions. Confirmer décrémente le stock ; annuler une commande
/// confirmée le restitue. Livrée et annulée sont finales.
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export async function transitionOrder(input: { orderId: string; status: OrderStatus; cancelReason?: string; actorId: string; byCustomer?: boolean }) {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Order" WHERE "id" = ${input.orderId}::uuid FOR UPDATE`;
    if (!rows[0]) throw new ApiError(404, "Commande introuvable.");
    const order = await tx.order.findUniqueOrThrow({ where: { id: input.orderId }, include: { items: true } });
    if (!TRANSITIONS[order.status].includes(input.status)) throw new ApiError(400, `Passage de « ${order.status} » à « ${input.status} » impossible.`);
    // Un client ne peut qu'annuler, et seulement tant que ce n'est pas expédié.
    if (input.byCustomer && (input.status !== "CANCELLED" || order.status === "SHIPPED")) throw new ApiError(400, "Cette commande ne peut plus être annulée.");
    if (input.status === "CANCELLED" && !input.cancelReason?.trim()) throw new ApiError(400, "Indiquez le motif de l'annulation.");

    if (input.status === "CONFIRMED") {
      for (const it of order.items) await move(tx, { productId: it.productId, quantity: -it.quantity, reason: "SALE", note: `Commande ${order.orderNumber}`, userId: input.actorId });
    }
    if (input.status === "CANCELLED" && order.status !== "PENDING") {
      for (const it of order.items) await move(tx, { productId: it.productId, quantity: it.quantity, reason: "RETURN", note: `Annulation ${order.orderNumber}`, userId: input.actorId });
    }
    return tx.order.update({
      where: { id: order.id },
      data: {
        status: input.status,
        cancelReason: input.status === "CANCELLED" ? input.cancelReason : order.cancelReason,
        confirmedAt: input.status === "CONFIRMED" ? new Date() : order.confirmedAt,
        shippedAt: input.status === "SHIPPED" ? new Date() : order.shippedAt,
        deliveredAt: input.status === "DELIVERED" ? new Date() : order.deliveredAt,
        // Paiement à la livraison : livrée = payée.
        paymentStatus: input.status === "DELIVERED" && order.paymentMethod === "CASH_ON_DELIVERY" ? "PAID" : order.paymentStatus,
      },
    });
  }, TX);
}
