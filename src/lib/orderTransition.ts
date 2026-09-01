import type { Order, Prisma } from "@prisma/client";
import { loadSettings } from "@/lib/settings";

type Tx = Prisma.TransactionClient;

/// Transitions autorisées — reprises telles quelles de advance_order_status
/// (Supabase) puis de la version Parse (parse-server/cloud/orders.js).
export const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

/// Applique une transition et tous ses effets, dans une seule transaction.
///
/// Appelée par deux routes (status/route.ts pour les transitions normales,
/// confirm-delivery/route.ts pour la livraison) : la logique — restitution
/// du stock à l'annulation, crédit du vendeur et points de fidélité à la
/// livraison — n'existe qu'ici, pour ne pas risquer qu'elle diverge entre
/// les deux routes.
export async function applyOrderTransition(
  tx: Tx,
  order: Order,
  status: string,
  note: string | undefined,
  actor: "seller" | "buyer",
) {
  await tx.order.update({
    where: { id: order.id },
    data: {
      status: status as Order["status"],
      paymentStatus: status === "delivered" && order.paymentMethod === "cod" ? "paid" : undefined,
    },
  });
  await tx.orderEvent.create({ data: { orderId: order.id, status, note } });

  if (status === "cancelled") {
    const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
    for (const item of items) {
      if (item.variantId) {
        await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
      } else if (item.productId) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }
    }
  }

  if (status === "delivered") {
    const shop = await tx.shop.findUniqueOrThrow({ where: { id: order.shopId } });
    const { commissionPercent } = await loadSettings();
    const commission = Math.floor((order.total * commissionPercent) / 100);
    const net = order.total - commission;

    await tx.wallet.upsert({
      where: { userId: shop.ownerId },
      update: { balance: { increment: net } },
      create: { userId: shop.ownerId, balance: net },
    });
    await tx.walletTransaction.create({
      data: { walletUserId: shop.ownerId, amount: net, kind: "sale_credit", orderId: order.id },
    });

    // 1 point de fidélité par tranche de 1000 FCFA.
    await tx.user.update({
      where: { id: order.buyerId },
      data: { loyaltyPoints: { increment: Math.floor(order.total / 1000) } },
    });

    // Bonus parrain (200 pts), à la première commande livrée du filleul.
    const referral = await tx.referral.findFirst({ where: { referredId: order.buyerId, rewardPoints: 0 } });
    if (referral) {
      await tx.user.update({ where: { id: referral.referrerId }, data: { loyaltyPoints: { increment: 200 } } });
      await tx.referral.update({ where: { id: referral.id }, data: { rewardPoints: 200 } });
    }
  }

  const shop = await tx.shop.findUniqueOrThrow({ where: { id: order.shopId } });
  const recipient = actor === "seller" ? order.buyerId : shop.ownerId;
  await tx.notification.create({
    data: {
      userId: recipient,
      type: "order",
      title: "Commande mise à jour",
      body: `Commande #${order.id.slice(0, 8)} : ${status}`,
      data: { orderId: order.id },
    },
  });
}
