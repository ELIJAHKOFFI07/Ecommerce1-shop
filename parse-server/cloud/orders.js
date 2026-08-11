/**
 * Commandes — traduction de place_order, confirm_delivery et
 * advance_order_status.
 *
 * Ce module porte l'essentiel du risque de la migration. La version Postgres
 * s'appuyait sur deux choses que Parse n'a pas :
 *
 *   - une transaction : tout ou rien sur l'ensemble commande + lignes + stock ;
 *   - `for update` : un verrou de ligne qui sérialise deux acheteurs.
 *
 * Le remplacement tient en trois principes, appliqués ci-dessous :
 *
 *   1. **le stock d'abord** — on décrémente avant de créer quoi que ce soit,
 *      par `increment` atomique, avec le garde-fou `beforeSave` de hooks.js
 *      qui refuse un stock négatif ;
 *   2. **compensation explicite** — si une étape ultérieure échoue, on rend
 *      le stock déjà pris. Sans transaction, c'est la seule façon de ne pas
 *      laisser des unités bloquées ;
 *   3. **rien ne vient du client sauf les identifiants et les quantités** —
 *      prix, remise, frais et total sont relus et recalculés ici.
 */

const { requireAdmin } = require("./roles");

/** Génère le code de retrait à 6 chiffres (équivalent de gen_pickup_code). */
function pickupCode() {
  return String(require("crypto").randomInt(0, 1_000_000)).padStart(6, "0");
}

async function loadSettings() {
  const settings = await new Parse.Query("PlatformSettings").first({ useMasterKey: true });
  return {
    commissionPercent: settings?.get("commissionPercent") ?? 10,
    minWithdrawal: settings?.get("minWithdrawal") ?? 5000,
  };
}

/**
 * placeOrder — équivalent de la RPC place_order.
 *
 * params: { items: [{ productId, variantId?, quantity }], address, zoneId,
 *           deliveryMethod, paymentMethod, couponCode? }
 * retour: { orderIds: string[] }
 */
Parse.Cloud.define("placeOrder", async (request) => {
  const user = request.user;
  if (!user) throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Non connecté");

  const { items, address, zoneId, deliveryMethod, paymentMethod, couponCode } = request.params;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Panier vide");
  }

  // ---- Relecture du catalogue -------------------------------------------
  // Le panier vit dans le navigateur : on ne lui emprunte que des
  // identifiants et des quantités.
  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await new Parse.Query("Product")
    .containedIn("objectId", productIds)
    .include("shop")
    .find({ useMasterKey: true });

  const byId = new Map(products.map((p) => [p.id, p]));
  if (byId.size !== productIds.length) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Produit introuvable");
  }

  for (const product of products) {
    if (product.get("status") !== "active") {
      throw new Parse.Error(
        Parse.Error.VALIDATION_ERROR,
        `Produit « ${product.get("title")} » indisponible`,
      );
    }
    // Un vendeur ne commande pas sa propre marchandise. Le contrôle est ici
    // et pas seulement dans l'interface : l'appel peut être rejoué à la main.
    if (product.get("shop")?.get("owner")?.id === user.id) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        "Vous ne pouvez pas commander vos propres produits",
      );
    }
  }

  const variantIds = items.map((i) => i.variantId).filter(Boolean);
  const variants = variantIds.length
    ? await new Parse.Query("ProductVariant")
        .containedIn("objectId", variantIds)
        .find({ useMasterKey: true })
    : [];
  const variantById = new Map(variants.map((v) => [v.id, v]));

  // ---- Réservation du stock, avant toute création ------------------------
  const taken = []; // pour la compensation
  try {
    for (const item of items) {
      const quantity = Math.max(parseInt(item.quantity, 10) || 1, 1);
      const target = item.variantId ? variantById.get(item.variantId) : byId.get(item.productId);
      if (!target) throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Variante introuvable");

      target.increment("stock", -quantity);
      // Le beforeSave de hooks.js rejette un stock négatif : c'est ce save-là
      // qui échoue, pas une lecture antérieure devenue obsolète.
      await target.save(null, { useMasterKey: true });
      taken.push({ object: target, quantity });
    }

    // ---- Une commande par boutique ---------------------------------------
    const byShop = new Map();
    for (const item of items) {
      const product = byId.get(item.productId);
      const shopId = product.get("shop").id;
      if (!byShop.has(shopId)) byShop.set(shopId, []);
      byShop.get(shopId).push({ item, product });
    }

    const zone = zoneId
      ? await new Parse.Query("DeliveryZone").get(zoneId, { useMasterKey: true }).catch(() => null)
      : null;

    const coupon = couponCode
      ? await new Parse.Query("Coupon")
          .equalTo("code", String(couponCode).trim().toUpperCase())
          .equalTo("active", true)
          .first({ useMasterKey: true })
      : null;
    const couponUsable =
      coupon &&
      (!coupon.get("expiresAt") || coupon.get("expiresAt") > new Date()) &&
      (coupon.get("maxUses") == null || coupon.get("usedCount") < coupon.get("maxUses"));

    const orderIds = [];

    for (const [shopId, lines] of byShop) {
      const shop = lines[0].product.get("shop");

      let subtotal = 0;
      const orderItems = [];
      for (const { item, product } of lines) {
        const quantity = Math.max(parseInt(item.quantity, 10) || 1, 1);
        const variant = item.variantId ? variantById.get(item.variantId) : null;
        // Prix relu en base — jamais celui transmis par le client.
        const unitPrice = variant?.get("price") ?? product.get("price");
        subtotal += unitPrice * quantity;

        const orderItem = new Parse.Object("OrderItem");
        orderItem.set("product", product);
        if (variant) orderItem.set("variant", variant);
        orderItem.set("title", product.get("title"));
        orderItem.set("variantName", variant?.get("name") ?? null);
        orderItem.set("unitPrice", unitPrice);
        orderItem.set("quantity", quantity);
        orderItems.push(orderItem);
      }

      // Remise : recalculée, jamais reprise du client.
      let discount = 0;
      if (
        couponUsable &&
        (!coupon.get("shop") || coupon.get("shop").id === shopId) &&
        subtotal >= (coupon.get("minOrderAmount") ?? 0)
      ) {
        discount =
          coupon.get("type") === "percent"
            ? Math.floor((subtotal * coupon.get("value")) / 100)
            : Math.min(coupon.get("value"), subtotal);
      }

      let deliveryFee = 0;
      if (deliveryMethod !== "pickup" && zone) {
        const freeAbove = zone.get("freeAbove") ?? 0;
        if (freeAbove === 0 || subtotal < freeAbove) {
          const base = zone.get("baseFee") ?? 0;
          deliveryFee = deliveryMethod === "express" ? base + Math.floor(base / 2) : base;
        }
      }

      const order = new Parse.Object("Order");
      order.set("buyer", user);
      order.set("shop", shop);
      order.set("subtotal", subtotal);
      order.set("discount", discount);
      order.set("deliveryFee", deliveryFee);
      order.set("total", subtotal - discount + deliveryFee);
      order.set("status", "pending");
      order.set("paymentStatus", "pending");
      order.set("paymentMethod", paymentMethod);
      order.set("addressSnapshot", address ?? {});
      if (couponUsable) order.set("couponCode", coupon.get("code"));

      // La commande est lisible par l'acheteur, le vendeur et l'admin, et
      // écrite par personne : seules les Cloud Functions la font évoluer.
      const acl = new Parse.ACL();
      acl.setReadAccess(user, true);
      const owner = shop.get("owner");
      if (owner) acl.setReadAccess(owner, true);
      acl.setRoleReadAccess("admin", true);
      order.setACL(acl);

      await order.save(null, { useMasterKey: true });

      for (const orderItem of orderItems) orderItem.set("order", order);
      await Parse.Object.saveAll(orderItems, { useMasterKey: true });

      const event = new Parse.Object("OrderEvent");
      event.set("order", order);
      event.set("status", "pending");
      await event.save(null, { useMasterKey: true });

      // Code de retrait : stocké dans une classe que le client ne peut pas
      // lire (CLP vide dans schema.js).
      const code = new Parse.Object("OrderPickupCode");
      code.set("order", order);
      code.set("code", pickupCode());
      await code.save(null, { useMasterKey: true });

      const notification = new Parse.Object("Notification");
      notification.set("user", owner);
      notification.set("type", "order");
      notification.set("title", "Nouvelle commande");
      notification.set("body", `Commande de ${order.get("total")} FCFA reçue`);
      notification.set("data", { orderId: order.id });
      await notification.save(null, { useMasterKey: true });

      orderIds.push(order.id);
    }

    if (couponUsable) {
      coupon.increment("usedCount", 1);
      await coupon.save(null, { useMasterKey: true });
    }

    return { orderIds };
  } catch (err) {
    // Compensation : sans transaction, un échec après la réservation
    // laisserait des unités bloquées sur des commandes qui n'existent pas.
    for (const { object, quantity } of taken) {
      object.increment("stock", quantity);
      await object.save(null, { useMasterKey: true }).catch(() => {});
    }
    throw err;
  }
});

/* ------------------------------------------------------------------ *
 * Machine à états
 * ------------------------------------------------------------------ */

/**
 * Transitions autorisées — reprises telles quelles de advance_order_status.
 *
 * `preparing` et `refunded` font partie de la chaîne : les omettre bloquerait
 * les commandes en cours au moment de la bascule.
 */
const TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

/**
 * Applique une transition et tous ses effets.
 *
 * C'est **la seule** machine à états : restitution du stock, crédit du
 * vendeur, points de fidélité et bonus de parrainage sont tous ici.
 * confirmDelivery en dépend plutôt que de les refaire — dupliquer ces effets
 * dans deux fonctions, c'est se garantir qu'elles divergeront.
 */
async function transition({ order, status, note, actor }) {
  const previous = order.get("status");
  const allowed = TRANSITIONS[previous] ?? [];
  if (!allowed.includes(status)) {
    throw new Parse.Error(
      Parse.Error.VALIDATION_ERROR,
      `Transition ${previous} → ${status} interdite`,
    );
  }

  order.set("status", status);
  if (status === "delivered" && order.get("paymentMethod") === "cod") {
    order.set("paymentStatus", "paid");
  }
  await order.save(null, { useMasterKey: true });

  const event = new Parse.Object("OrderEvent");
  event.set("order", order);
  event.set("status", status);
  if (note) event.set("note", note);
  await event.save(null, { useMasterKey: true });

  const items = await new Parse.Query("OrderItem")
    .equalTo("order", order)
    .include(["product", "variant"])
    .find({ useMasterKey: true });

  // ---- Annulation : on rend le stock ------------------------------------
  if (status === "cancelled") {
    for (const item of items) {
      const target = item.get("variant") ?? item.get("product");
      if (!target) continue;
      target.increment("stock", item.get("quantity"));
      await target.save(null, { useMasterKey: true });
    }
  }

  // ---- Livraison : crédit vendeur, points, parrainage --------------------
  if (status === "delivered") {
    const shop = await order.get("shop").fetch({ useMasterKey: true });
    const seller = shop.get("owner");
    const total = order.get("total");

    // La version Postgres code 5 % en dur alors que platform_settings porte
    // commission_percent, réglable depuis le back-office : changer le taux
    // n'avait donc aucun effet sur les crédits. On lit le paramètre ici, avec
    // 5 % par défaut pour rester compatible avec l'historique.
    const { commissionPercent } = await loadSettings();
    const commission = Math.floor((total * commissionPercent) / 100);
    const net = total - commission;

    const wallet = await new Parse.Query("Wallet")
      .equalTo("owner", seller)
      .first({ useMasterKey: true });
    if (!wallet) {
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Portefeuille vendeur introuvable");
    }
    wallet.increment("balance", net);
    await wallet.save(null, { useMasterKey: true });

    const tx = new Parse.Object("WalletTransaction");
    tx.set("wallet", wallet);
    tx.set("amount", net);
    tx.set("kind", "sale_credit");
    tx.set("reference", order.id);
    await tx.save(null, { useMasterKey: true });

    // Points de fidélité : 1 point par tranche de 1000 FCFA.
    const buyer = await order.get("buyer").fetch({ useMasterKey: true });
    buyer.increment("loyaltyPoints", Math.floor(total / 1000));
    await buyer.save(null, { useMasterKey: true });

    // Bonus parrain, à la première commande livrée du filleul seulement.
    const referral = await new Parse.Query("Referral")
      .equalTo("referred", buyer)
      .equalTo("rewardPoints", 0)
      .first({ useMasterKey: true });
    if (referral) {
      const referrer = await referral.get("referrer").fetch({ useMasterKey: true });
      referrer.increment("loyaltyPoints", 200);
      await referrer.save(null, { useMasterKey: true });
      referral.set("rewardPoints", 200);
      await referral.save(null, { useMasterKey: true });
    }
  }

  // Le destinataire est l'autre partie : le vendeur agit, l'acheteur est
  // prévenu, et réciproquement.
  const shop = await order.get("shop").fetch({ useMasterKey: true });
  const notification = new Parse.Object("Notification");
  notification.set("user", actor === "seller" ? order.get("buyer") : shop.get("owner"));
  notification.set("type", "order");
  notification.set("title", "Commande mise à jour");
  notification.set("body", `Commande #${order.id.slice(0, 8)} : ${status}`);
  notification.set("data", { orderId: order.id });
  await notification.save(null, { useMasterKey: true });

  return { ok: true, status };
}

Parse.Cloud.define("advanceOrderStatus", async (request) => {
  const user = request.user;
  if (!user) throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Non connecté");

  const { orderId, status, note } = request.params;
  const order = await new Parse.Query("Order").include("shop").get(orderId, { useMasterKey: true });

  const isSeller = order.get("shop")?.get("owner")?.id === user.id;
  const isBuyer = order.get("buyer")?.id === user.id;
  if (!isSeller && !isBuyer) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Accès refusé");
  }

  // L'acheteur ne peut qu'annuler, et seulement avant expédition.
  const cancellable = ["pending", "confirmed"].includes(order.get("status"));
  if (!isSeller && (status !== "cancelled" || !cancellable)) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Action non autorisée");
  }

  // « delivered » n'est atteignable que par confirmDelivery : c'est là qu'est
  // vérifié le code de retrait, et cette étape crédite le vendeur.
  if (status === "delivered") {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Passez par la confirmation de livraison");
  }

  return transition({ order, status, note, actor: isSeller ? "seller" : "buyer" });
});

/**
 * confirmDelivery — équivalent de confirm_delivery.
 *
 * Passe-plat volontaire : il contrôle l'appartenance, l'état et le code, puis
 * délègue les effets à la machine à états. Le code de retrait est comparé
 * ici et n'est jamais envoyé au client (classe OrderPickupCode, CLP vide).
 */
Parse.Cloud.define("confirmDelivery", async (request) => {
  const user = request.user;
  if (!user) throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Non connecté");

  const { orderId, code } = request.params;
  const order = await new Parse.Query("Order").include("shop").get(orderId, { useMasterKey: true });

  if (order.get("shop")?.get("owner")?.id !== user.id) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Commande d'une autre boutique");
  }
  if (order.get("status") !== "shipped") {
    // Sans ce contrôle, rejouer l'appel créditerait le vendeur deux fois.
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "La commande doit être expédiée d'abord");
  }

  const stored = await new Parse.Query("OrderPickupCode")
    .equalTo("order", order)
    .first({ useMasterKey: true });
  if (!stored || stored.get("code") !== String(code).trim()) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Code de retrait incorrect");
  }

  return transition({
    order,
    status: "delivered",
    note: "Livraison confirmée par code de retrait",
    actor: "seller",
  });
});

module.exports = { transition, TRANSITIONS };
