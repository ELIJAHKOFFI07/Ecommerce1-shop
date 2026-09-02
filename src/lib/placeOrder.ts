import { randomInt } from "crypto";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/apiError";
import { TRANSACTION_OPTIONS } from "@/lib/transactionOptions";
import { emailNotification } from "@/lib/notify";

export type PlaceOrderInput = {
  items: { productId: string; variantId?: string; quantity: number }[];
  address?: object;
  zoneId?: string;
  deliveryMethod: string;
  paymentMethod: string;
  couponCode?: string;
};

/// placeOrder — équivalent de la RPC place_order de Supabase.
///
/// Extraite du Route Handler pour être testable directement (auth() dépend
/// du contexte requête Next.js et ne fonctionne pas hors serveur — cette
/// fonction, elle, ne prend qu'un userId déjà vérifié).
///
/// La bascule vers un vrai Postgres (plutôt que Mongo via Parse) redonne
/// accès à ce qui manquait le plus cruellement dans la tentative Parse :
/// une vraie transaction ET un vrai verrou de ligne (`for update`). Plus
/// besoin du verrou en mémoire par process (parse-server/cloud/lock.js) —
/// Postgres sérialise lui-même les lectures concurrentes du même produit à
/// l'intérieur de la transaction.
///
/// Toujours la même règle : le panier vit dans le navigateur, seuls les
/// identifiants et quantités en sont tirés — prix, remise, frais et total
/// sont relus et recalculés ici.
export async function placeOrder(userId: string, input: PlaceOrderInput): Promise<string[]> {
  const { items, address, zoneId, deliveryMethod, paymentMethod, couponCode } = input;

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Panier vide");
  }

  /// E-mails à envoyer une fois la transaction validée — accumulés pendant,
  /// envoyés après (voir src/lib/notify.ts).
  const pendingEmails: Parameters<typeof emailNotification>[0][] = [];

  const orderIds = await db.$transaction(async (tx) => {
    // ---- Verrouillage des produits concernés, dans un ordre stable ----
    // Trier par id avant de verrouiller est ce qui évite les interblocages
    // (deadlocks) entre deux commandes qui portent sur les mêmes produits
    // dans un ordre différent — la même règle que `for update` imposait
    // déjà implicitement côté SQL d'origine.
    const productIds = [...new Set(items.map((i) => i.productId))].sort();
    const products = await tx.$queryRaw<
      { id: string; shopId: string; sellerId: string; title: string; price: number; stock: number; status: string }[]
    >(Prisma.sql`
      SELECT id, "shopId", "sellerId", title, price, stock, status
      FROM "Product"
      WHERE id = ANY(${productIds}::uuid[])
      ORDER BY id
      FOR UPDATE
    `);
    const byId = new Map(products.map((p) => [p.id, p]));
    if (byId.size !== productIds.length) throw new ApiError(400, "Produit introuvable");

    for (const product of products) {
      if (product.status !== "active") {
        throw new ApiError(400, `Produit « ${product.title} » indisponible`);
      }
    }

    const shops = await tx.shop.findMany({
      where: { id: { in: [...new Set(products.map((p) => p.shopId))] } },
    });
    const shopById = new Map(shops.map((s) => [s.id, s]));
    for (const product of products) {
      if (shopById.get(product.shopId)?.ownerId === userId) {
        throw new ApiError(403, "Vous ne pouvez pas commander vos propres produits");
      }
    }

    const variantIds = items.map((i) => i.variantId).filter((x): x is string => Boolean(x));
    const variants = variantIds.length
      ? await tx.$queryRaw<{ id: string; productId: string; name: string; price: number | null; stock: number }[]>(
          Prisma.sql`SELECT id, "productId", name, price, stock FROM "ProductVariant" WHERE id = ANY(${[...new Set(variantIds)].sort()}::uuid[]) ORDER BY id FOR UPDATE`,
        )
      : [];
    const variantById = new Map(variants.map((v) => [v.id, v]));

    // ---- Vérification et décrément du stock — sous le verrou déjà pris ----
    for (const item of items) {
      const quantity = Math.max(Math.trunc(item.quantity) || 1, 1);
      if (item.variantId) {
        const variant = variantById.get(item.variantId);
        if (!variant) throw new ApiError(400, "Variante introuvable");
        if (variant.stock < quantity) {
          throw new ApiError(400, `Stock insuffisant pour ${byId.get(item.productId)?.title}`);
        }
        await tx.productVariant.update({ where: { id: variant.id }, data: { stock: { decrement: quantity } } });
      } else {
        const product = byId.get(item.productId)!;
        if (product.stock < quantity) throw new ApiError(400, `Stock insuffisant pour ${product.title}`);
        await tx.product.update({ where: { id: product.id }, data: { stock: { decrement: quantity } } });
      }
    }

    // ---- Coupon et zone de livraison ----
    const coupon = couponCode
      ? await tx.coupon.findFirst({
          where: {
            code: couponCode.trim().toUpperCase(),
            active: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        })
      : null;
    const zone = zoneId ? await tx.deliveryZone.findUnique({ where: { id: zoneId } }) : null;

    // ---- Une commande par boutique ----
    const byShop = new Map<string, { item: (typeof items)[number]; product: (typeof products)[number] }[]>();
    for (const item of items) {
      const product = byId.get(item.productId)!;
      if (!byShop.has(product.shopId)) byShop.set(product.shopId, []);
      byShop.get(product.shopId)!.push({ item, product });
    }

    const orderIds: string[] = [];

    for (const [shopId, lines] of byShop) {
      let subtotal = 0;
      const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

      for (const { item, product } of lines) {
        const quantity = Math.max(Math.trunc(item.quantity) || 1, 1);
        const variant = item.variantId ? variantById.get(item.variantId) : null;
        const unitPrice = variant?.price ?? product.price;
        subtotal += unitPrice * quantity;
        orderItemsData.push({
          productId: product.id,
          variantId: variant?.id ?? null,
          title: product.title,
          variantName: variant?.name ?? null,
          unitPrice,
          quantity,
        });
      }

      let discount = 0;
      if (
        coupon &&
        (!coupon.shopId || coupon.shopId === shopId) &&
        subtotal >= coupon.minOrderAmount &&
        (coupon.maxUses == null || coupon.usedCount < coupon.maxUses)
      ) {
        discount =
          coupon.type === "percent" ? Math.floor((subtotal * coupon.value) / 100) : Math.min(coupon.value, subtotal);
      }

      let deliveryFee = 0;
      if (deliveryMethod !== "pickup" && zone) {
        if (zone.freeAbove === 0 || subtotal < zone.freeAbove) {
          deliveryFee = deliveryMethod === "express" ? zone.baseFee + Math.floor(zone.baseFee / 2) : zone.baseFee;
        }
      }

      const order = await tx.order.create({
        data: {
          buyerId: userId,
          shopId,
          zoneId: zone?.id,
          subtotal,
          discount,
          deliveryFee,
          total: subtotal - discount + deliveryFee,
          paymentMethod,
          paymentStatus: "pending",
          addressSnapshot: (address ?? {}) as Prisma.InputJsonValue,
          couponCode: coupon ? coupon.code : null,
          items: { createMany: { data: orderItemsData } },
          events: { create: { status: "pending" } },
          pickupCode: { create: { code: String(randomInt(0, 1_000_000)).padStart(6, "0") } },
        },
      });

      const shop = shopById.get(shopId)!;
      // La notification reste DANS la transaction : si la commande échoue et
      // que tout est annulé, elle doit disparaître avec. L'e-mail, lui, part
      // après le commit (voir plus bas et src/lib/notify.ts).
      await tx.notification.create({
        data: {
          userId: shop.ownerId,
          type: "order",
          title: "Nouvelle commande",
          body: `Commande de ${order.total} FCFA reçue`,
          data: { orderId: order.id },
        },
      });
      pendingEmails.push({
        userId: shop.ownerId,
        type: "order",
        title: "Nouvelle commande",
        body: `Commande de ${order.total} FCFA reçue`,
        actionUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/play/sell`,
        actionLabel: "Voir la commande",
      });

      orderIds.push(order.id);
    }

    if (coupon) {
      await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
    }

    return orderIds;
  }, TRANSACTION_OPTIONS);

  // Commit passé : les commandes existent vraiment, on peut prévenir.
  for (const email of pendingEmails) await emailNotification(email);

  return orderIds;
}
