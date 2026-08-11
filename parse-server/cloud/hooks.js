/**
 * Hooks — traduction des 12 triggers Postgres et des règles que ni les CLP
 * ni les ACL ne savent exprimer.
 */

const { addToRole } = require("./roles");

/* ------------------------------------------------------------------ *
 * Stock : le garde-fou anti-survente
 * ------------------------------------------------------------------ */

/**
 * Parse n'a pas d'équivalent du `select … for update` de Postgres. Le schéma
 * repose donc sur deux choses :
 *
 *   1. `increment('stock', -qty)` — l'opération est atomique côté base, deux
 *      commandes simultanées ne peuvent pas lire la même valeur puis écrire
 *      chacune la sienne.
 *   2. ce hook — il refuse l'enregistrement si le compteur est passé sous
 *      zéro. C'est lui qui transforme un décrément atomique en garantie de
 *      non-survente ; sans lui, `increment` accepterait un stock négatif.
 *
 * Traduire naïvement `for update` par un `query.first()` suivi d'un `save()`
 * réintroduirait exactement la survente que le verrou Postgres évitait.
 */
function guardStock(className) {
  Parse.Cloud.beforeSave(className, (request) => {
    const stock = request.object.get("stock");
    if (typeof stock === "number" && stock < 0) {
      throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Stock insuffisant");
    }
  });
}
guardStock("Product");
guardStock("ProductVariant");

/* ------------------------------------------------------------------ *
 * Utilisateurs — trigger on_auth_user_created / handle_new_user
 * ------------------------------------------------------------------ */

Parse.Cloud.afterSave(Parse.User, async (request) => {
  if (request.object.existed()) return;
  const user = request.object;

  // Portefeuille : un par compte, créé tout de suite. La version Postgres le
  // créait dans le même trigger que le profil ; un compte sans portefeuille
  // faisait échouer la première vente.
  const wallet = new Parse.Object("Wallet");
  wallet.set("owner", user);
  wallet.set("balance", 0);
  await wallet.save(null, { useMasterKey: true });

  // Code de parrainage. Postgres utilisait gen_random_bytes (pgcrypto) — son
  // absence cassait toute inscription. Ici, la source d'aléa est celle de
  // Node, sans extension à installer.
  if (!user.get("referralCode")) {
    const code = require("crypto").randomBytes(4).toString("hex").toUpperCase();
    user.set("referralCode", code);
    await user.save(null, { useMasterKey: true });
  }
});

/* ------------------------------------------------------------------ *
 * Boutiques — trigger on_shop_created
 * ------------------------------------------------------------------ */

Parse.Cloud.afterSave("Shop", async (request) => {
  if (request.object.existed()) return;
  const owner = request.object.get("owner");
  if (owner) await addToRole(owner, "seller");
});

Parse.Cloud.beforeSave("Shop", (request) => {
  const shop = request.object;
  if (shop.existed()) return;

  // Le propriétaire est celui qui crée, pas celui que le client déclare.
  if (request.user) shop.set("owner", request.user);

  const acl = new Parse.ACL();
  acl.setPublicReadAccess(true);
  if (request.user) acl.setWriteAccess(request.user, true);
  acl.setRoleWriteAccess("admin", true);
  shop.setACL(acl);
});

/* ------------------------------------------------------------------ *
 * Produits — trigger before_product_insert / set_product_seller
 * ------------------------------------------------------------------ */

Parse.Cloud.beforeSave("Product", async (request) => {
  const product = request.object;
  if (request.master) return;

  if (!request.user) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Non connecté");
  }

  if (!product.existed()) {
    // Le vendeur est déduit de la boutique, jamais accepté depuis le client.
    const shop = product.get("shop");
    if (!shop) {
      throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Boutique manquante");
    }
    const fetched = await shop.fetch({ useMasterKey: true });
    const owner = fetched.get("owner");
    if (owner.id !== request.user.id) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Boutique d'un autre vendeur");
    }
    product.set("seller", owner);

    const acl = new Parse.ACL();
    acl.setPublicReadAccess(true);
    acl.setWriteAccess(owner, true);
    acl.setRoleWriteAccess("admin", true);
    product.setACL(acl);
  }

  const price = product.get("price");
  if (typeof price === "number" && (price < 0 || !Number.isInteger(price))) {
    // Les montants sont des entiers en FCFA : un prix flottant passerait les
    // arrondis de calcul de commission sur des valeurs non représentables.
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Prix invalide");
  }
});

/* ------------------------------------------------------------------ *
 * Favoris — trigger on_favorite_change / sync_favorites_count
 * ------------------------------------------------------------------ */

async function bumpFavorites(product, delta) {
  if (!product) return;
  product.increment("favoritesCount", delta);
  await product.save(null, { useMasterKey: true });
}

Parse.Cloud.afterSave("Favorite", async (request) => {
  if (request.object.existed()) return;
  await bumpFavorites(request.object.get("product"), 1);
});

Parse.Cloud.afterDelete("Favorite", async (request) => {
  await bumpFavorites(request.object.get("product"), -1);
});

/* ------------------------------------------------------------------ *
 * Messagerie — trigger on_message_created
 * ------------------------------------------------------------------ */

Parse.Cloud.beforeSave("Message", async (request) => {
  const message = request.object;
  if (request.master || message.existed()) return;
  if (!request.user) throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Non connecté");

  const conversation = await message.get("conversation").fetch({ useMasterKey: true });
  const participants = conversation.get("participants") ?? [];
  if (!participants.includes(request.user.id)) {
    // Reproduit la policy RLS messages_insert : on n'écrit pas dans une
    // conversation dont on ne fait pas partie.
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Conversation inaccessible");
  }

  const other = participants.find((id) => id !== request.user.id);
  const blocked = new Parse.Query("Block");
  blocked.equalTo("blockerId", other);
  blocked.equalTo("blockedId", request.user.id);
  if (await blocked.first({ useMasterKey: true })) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Envoi impossible");
  }

  message.set("sender", request.user);
});

Parse.Cloud.afterSave("Message", async (request) => {
  if (request.object.existed()) return;
  const conversation = request.object.get("conversation");
  conversation.set("lastMessage", request.object.get("content"));
  await conversation.save(null, { useMasterKey: true });
});

/* ------------------------------------------------------------------ *
 * Notifications — trigger on_notification_created / dispatch_notification
 * ------------------------------------------------------------------ */

Parse.Cloud.afterSave("Notification", async (request) => {
  if (request.object.existed()) return;
  // Côté Supabase, ce trigger appelait deux Edge Functions par pg_net, avec un
  // en-tête x-webhook-secret parce qu'elles étaient publiquement joignables.
  // Ici l'envoi est dans le même process : plus de secret partagé à gérer.
  // TODO(migration) : brancher notify.sendEmail / notify.sendPush.
});
