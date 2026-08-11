/**
 * Schéma Parse — classes, champs, index et CLP.
 *
 * Idempotent : au démarrage, chaque classe est créée si absente, mise à jour
 * sinon. C'est l'équivalent de supabase/SETUP_COMPLET.sql, qui est lui aussi
 * ré-exécutable — une migration qu'on ne peut pas rejouer est une migration
 * qu'on n'ose pas rejouer.
 *
 * Les CLP posés ici sont le **grillage** : ils disent qui peut, en gros,
 * toucher une classe. Le détail « ce compte-ci, cet objet-là » est porté par
 * les ACL posées dans hooks.js. Les deux sont nécessaires ; ni l'un ni
 * l'autre ne suffit.
 */

/** Lecture publique, écriture réservée à la master key (Cloud Functions). */
const PUBLIC_READ_SERVER_WRITE = {
  find: { "*": true },
  get: { "*": true },
  count: { "*": true },
  create: {},
  update: {},
  delete: {},
  addField: {},
};

/** Ni lu ni écrit par un client : tout passe par une Cloud Function. */
const SERVER_ONLY = {
  find: {},
  get: {},
  count: {},
  create: {},
  update: {},
  delete: {},
  addField: {},
};

/** Lecture publique, écriture par un utilisateur connecté (puis filtrée par ACL). */
const PUBLIC_READ_USER_WRITE = {
  find: { "*": true },
  get: { "*": true },
  count: { "*": true },
  create: { requiresAuthentication: true },
  update: { requiresAuthentication: true },
  delete: { requiresAuthentication: true },
  addField: {},
};

const CLASSES = [
  // ---- Catalogue : lisible sans compte, c'est la vitrine publique --------
  {
    name: "Category",
    fields: { name: "String", slug: "String", position: "Number", image: "File" },
    indexes: { slug: { slug: 1 } },
    clp: PUBLIC_READ_SERVER_WRITE,
  },
  {
    name: "Shop",
    fields: {
      name: "String",
      slug: "String",
      owner: { type: "Pointer", targetClass: "_User" },
      city: "String",
      logo: "File",
      identityVerified: "Boolean",
    },
    indexes: { owner: { owner: 1 }, slug: { slug: 1 } },
    clp: PUBLIC_READ_USER_WRITE,
  },
  {
    name: "Product",
    fields: {
      title: "String",
      description: "String",
      // Les montants sont des entiers en FCFA. Aucun flottant sur de
      // l'argent : 0.1 + 0.2 ne vaut pas 0.3.
      price: "Number",
      compareAtPrice: "Number",
      stock: "Number",
      status: "String",
      city: "String",
      shop: { type: "Pointer", targetClass: "Shop" },
      seller: { type: "Pointer", targetClass: "_User" },
      category: { type: "Pointer", targetClass: "Category" },
      favoritesCount: "Number",
      viewsCount: "Number",
    },
    indexes: {
      shop: { shop: 1 },
      status_created: { status: 1, createdAt: -1 },
      category: { category: 1 },
    },
    clp: PUBLIC_READ_USER_WRITE,
  },
  {
    name: "ProductVariant",
    fields: {
      product: { type: "Pointer", targetClass: "Product" },
      name: "String",
      price: "Number",
      stock: "Number",
    },
    indexes: { product: { product: 1 } },
    clp: PUBLIC_READ_USER_WRITE,
  },

  // ---- Commerce : le client ne crée jamais ces objets lui-même ----------
  {
    name: "Order",
    fields: {
      buyer: { type: "Pointer", targetClass: "_User" },
      shop: { type: "Pointer", targetClass: "Shop" },
      subtotal: "Number",
      discount: "Number",
      deliveryFee: "Number",
      total: "Number",
      status: "String",
      paymentMethod: "String",
      paymentStatus: "String",
      addressSnapshot: "Object",
      couponCode: "String",
    },
    indexes: { buyer: { buyer: 1, createdAt: -1 }, shop: { shop: 1, createdAt: -1 } },
    // Lecture filtrée par ACL (acheteur + vendeur + admin), écriture par
    // Cloud Function : un client qui pourrait écrire ici fixerait son total.
    clp: {
      find: { requiresAuthentication: true },
      get: { requiresAuthentication: true },
      count: { requiresAuthentication: true },
      create: {},
      update: {},
      delete: {},
      addField: {},
    },
  },
  {
    name: "OrderItem",
    fields: {
      order: { type: "Pointer", targetClass: "Order" },
      product: { type: "Pointer", targetClass: "Product" },
      variant: { type: "Pointer", targetClass: "ProductVariant" },
      title: "String",
      variantName: "String",
      unitPrice: "Number",
      quantity: "Number",
      imageUrl: "String",
    },
    indexes: { order: { order: 1 } },
    clp: {
      find: { requiresAuthentication: true },
      get: { requiresAuthentication: true },
      count: { requiresAuthentication: true },
      create: {},
      update: {},
      delete: {},
      addField: {},
    },
  },
  {
    name: "OrderEvent",
    fields: {
      order: { type: "Pointer", targetClass: "Order" },
      status: "String",
      note: "String",
    },
    indexes: { order: { order: 1 } },
    clp: {
      find: { requiresAuthentication: true },
      get: { requiresAuthentication: true },
      count: { requiresAuthentication: true },
      create: {},
      update: {},
      delete: {},
      addField: {},
    },
  },
  {
    // Le code de retrait ne doit jamais transiter vers un client : il est
    // comparé côté serveur par confirmDelivery. Le laisser lisible reviendrait
    // à laisser n'importe qui valider une livraison qu'il n'a pas reçue.
    name: "OrderPickupCode",
    fields: { order: { type: "Pointer", targetClass: "Order" }, code: "String" },
    indexes: { order: { order: 1 } },
    clp: SERVER_ONLY,
  },
  {
    name: "Coupon",
    fields: {
      code: "String",
      type: "String",
      value: "Number",
      minOrderAmount: "Number",
      maxUses: "Number",
      usedCount: "Number",
      active: "Boolean",
      expiresAt: "Date",
      shop: { type: "Pointer", targetClass: "Shop" },
    },
    indexes: { code: { code: 1 } },
    clp: SERVER_ONLY,
  },
  {
    name: "DeliveryZone",
    fields: { name: "String", baseFee: "Number", freeAbove: "Number" },
    clp: PUBLIC_READ_SERVER_WRITE,
  },

  // ---- Argent : master key exclusivement, sans exception ----------------
  {
    name: "Wallet",
    fields: { owner: { type: "Pointer", targetClass: "_User" }, balance: "Number" },
    indexes: { owner: { owner: 1 } },
    clp: SERVER_ONLY,
  },
  {
    name: "WalletTransaction",
    fields: {
      wallet: { type: "Pointer", targetClass: "Wallet" },
      amount: "Number",
      kind: "String",
      reference: "String",
    },
    indexes: { wallet: { wallet: 1, createdAt: -1 } },
    clp: SERVER_ONLY,
  },

  // ---- Négociation et enchères -----------------------------------------
  {
    name: "Offer",
    fields: {
      product: { type: "Pointer", targetClass: "Product" },
      buyer: { type: "Pointer", targetClass: "_User" },
      amount: "Number",
      status: "String",
      counterAmount: "Number",
    },
    indexes: { product: { product: 1 }, buyer: { buyer: 1 } },
    clp: SERVER_ONLY,
  },
  {
    name: "Auction",
    fields: {
      product: { type: "Pointer", targetClass: "Product" },
      startingPrice: "Number",
      currentPrice: "Number",
      endsAt: "Date",
      status: "String",
      winner: { type: "Pointer", targetClass: "_User" },
    },
    indexes: { status_ends: { status: 1, endsAt: 1 } },
    clp: {
      find: { "*": true },
      get: { "*": true },
      count: { "*": true },
      create: {},
      update: {},
      delete: {},
      addField: {},
    },
  },
  {
    name: "Bid",
    fields: {
      auction: { type: "Pointer", targetClass: "Auction" },
      bidder: { type: "Pointer", targetClass: "_User" },
      amount: "Number",
    },
    indexes: { auction: { auction: 1, amount: -1 } },
    clp: {
      find: { "*": true },
      get: { "*": true },
      count: { "*": true },
      create: {},
      update: {},
      delete: {},
      addField: {},
    },
  },

  // ---- Social -----------------------------------------------------------
  {
    name: "Conversation",
    fields: {
      participants: "Array",
      product: { type: "Pointer", targetClass: "Product" },
      lastMessage: "String",
    },
    indexes: { participants: { participants: 1 } },
    clp: {
      find: { requiresAuthentication: true },
      get: { requiresAuthentication: true },
      count: { requiresAuthentication: true },
      create: {},
      update: {},
      delete: {},
      addField: {},
    },
  },
  {
    name: "Message",
    fields: {
      conversation: { type: "Pointer", targetClass: "Conversation" },
      sender: { type: "Pointer", targetClass: "_User" },
      content: "String",
      readAt: "Date",
    },
    indexes: { conversation: { conversation: 1, createdAt: 1 } },
    clp: {
      find: { requiresAuthentication: true },
      get: { requiresAuthentication: true },
      count: { requiresAuthentication: true },
      create: { requiresAuthentication: true },
      update: {},
      delete: {},
      addField: {},
    },
  },
  {
    name: "Notification",
    fields: {
      user: { type: "Pointer", targetClass: "_User" },
      type: "String",
      title: "String",
      body: "String",
      data: "Object",
      readAt: "Date",
    },
    indexes: { user: { user: 1, createdAt: -1 } },
    clp: {
      find: { requiresAuthentication: true },
      get: { requiresAuthentication: true },
      count: { requiresAuthentication: true },
      create: {},
      update: { requiresAuthentication: true }, // marquer comme lu
      delete: {},
      addField: {},
    },
  },

  // ---- Système ----------------------------------------------------------
  {
    name: "PlatformSettings",
    fields: {
      commissionPercent: "Number",
      minWithdrawal: "Number",
      supportPhone: "String",
      supportEmail: "String",
      announcement: "String",
      announcementActive: "Boolean",
    },
    clp: PUBLIC_READ_SERVER_WRITE,
  },
  {
    name: "StockMovement",
    fields: {
      product: { type: "Pointer", targetClass: "Product" },
      variant: { type: "Pointer", targetClass: "ProductVariant" },
      delta: "Number",
      reason: "String",
      createdBy: { type: "Pointer", targetClass: "_User" },
    },
    indexes: { product: { product: 1, createdAt: -1 } },
    clp: SERVER_ONLY,
  },

  // ---- Croissance et engagement ------------------------------------------
  {
    name: "PriceHistory",
    fields: { product: { type: "Pointer", targetClass: "Product" }, price: "Number" },
    indexes: { product: { product: 1, createdAt: 1 } },
    clp: PUBLIC_READ_SERVER_WRITE,
  },
  {
    name: "PriceAlert",
    fields: {
      user: { type: "Pointer", targetClass: "_User" },
      product: { type: "Pointer", targetClass: "Product" },
      priceAtCreation: "Number",
      notified: "Boolean",
    },
    indexes: { unique: { user: 1, product: 1 } },
    clp: {
      find: { requiresAuthentication: true },
      get: { requiresAuthentication: true },
      count: { requiresAuthentication: true },
      create: { requiresAuthentication: true },
      update: {},
      delete: { requiresAuthentication: true },
      addField: {},
    },
  },
  {
    name: "ProductBoost",
    fields: {
      product: { type: "Pointer", targetClass: "Product" },
      shop: { type: "Pointer", targetClass: "Shop" },
      cost: "Number",
      startsAt: "Date",
      endsAt: "Date",
    },
    indexes: { endsAt: { endsAt: 1 } },
    clp: PUBLIC_READ_SERVER_WRITE,
  },
  {
    name: "ProductQuestion",
    fields: {
      product: { type: "Pointer", targetClass: "Product" },
      author: { type: "Pointer", targetClass: "_User" },
      question: "String",
      answer: "String",
      answeredAt: "Date",
    },
    indexes: { product: { product: 1, createdAt: -1 } },
    clp: {
      find: { "*": true },
      get: { "*": true },
      count: { "*": true },
      create: { requiresAuthentication: true },
      update: {},
      delete: {},
      addField: {},
    },
  },
  {
    name: "RecentlyViewed",
    fields: {
      user: { type: "Pointer", targetClass: "_User" },
      product: { type: "Pointer", targetClass: "Product" },
      viewedAt: "Date",
    },
    indexes: { unique: { user: 1, product: 1 }, product: { product: 1, viewedAt: -1 } },
    clp: {
      find: { requiresAuthentication: true },
      get: { requiresAuthentication: true },
      count: {},
      create: {},
      update: {},
      delete: {},
      addField: {},
    },
  },
  {
    name: "Favorite",
    fields: {
      user: { type: "Pointer", targetClass: "_User" },
      product: { type: "Pointer", targetClass: "Product" },
    },
    indexes: { unique: { user: 1, product: 1 } },
    clp: {
      find: { requiresAuthentication: true },
      get: { requiresAuthentication: true },
      count: { requiresAuthentication: true },
      create: { requiresAuthentication: true },
      update: {},
      delete: { requiresAuthentication: true },
      addField: {},
    },
  },
  {
    name: "Wishlist",
    fields: { owner: { type: "Pointer", targetClass: "_User" }, name: "String" },
    indexes: { owner: { owner: 1 } },
    clp: {
      find: { requiresAuthentication: true },
      get: { "*": true }, // une wishlist peut être partagée par son id
      count: { requiresAuthentication: true },
      create: { requiresAuthentication: true },
      update: { requiresAuthentication: true },
      delete: { requiresAuthentication: true },
      addField: {},
    },
  },
  {
    name: "WishlistItem",
    fields: {
      wishlist: { type: "Pointer", targetClass: "Wishlist" },
      product: { type: "Pointer", targetClass: "Product" },
    },
    indexes: { wishlist: { wishlist: 1 } },
    clp: {
      find: { "*": true },
      get: { "*": true },
      count: { "*": true },
      create: { requiresAuthentication: true },
      update: {},
      delete: { requiresAuthentication: true },
      addField: {},
    },
  },
  {
    name: "Review",
    fields: {
      shop: { type: "Pointer", targetClass: "Shop" },
      product: { type: "Pointer", targetClass: "Product" },
      author: { type: "Pointer", targetClass: "_User" },
      rating: "Number",
      comment: "String",
    },
    indexes: { shop: { shop: 1 }, product: { product: 1 } },
    clp: PUBLIC_READ_USER_WRITE,
  },
  {
    name: "SpinReward",
    fields: {
      user: { type: "Pointer", targetClass: "_User" },
      prizeKind: "String",
      prizeValue: "Number",
      couponCode: "String",
    },
    indexes: { user: { user: 1, createdAt: -1 } },
    clp: SERVER_ONLY,
  },
  {
    name: "Referral",
    fields: {
      referrer: { type: "Pointer", targetClass: "_User" },
      referred: { type: "Pointer", targetClass: "_User" },
      code: "String",
      rewardPoints: "Number",
    },
    indexes: { referrer: { referrer: 1 }, referred: { referred: 1 } },
    clp: SERVER_ONLY,
  },
  {
    name: "Address",
    fields: {
      owner: { type: "Pointer", targetClass: "_User" },
      label: "String",
      city: "String",
      details: "String",
    },
    indexes: { owner: { owner: 1 } },
    clp: {
      find: { requiresAuthentication: true },
      get: { requiresAuthentication: true },
      count: { requiresAuthentication: true },
      create: { requiresAuthentication: true },
      update: { requiresAuthentication: true },
      delete: { requiresAuthentication: true },
      addField: {},
    },
  },
  {
    name: "Follow",
    fields: {
      user: { type: "Pointer", targetClass: "_User" },
      shop: { type: "Pointer", targetClass: "Shop" },
    },
    indexes: { unique: { user: 1, shop: 1 } },
    clp: {
      find: { "*": true },
      get: { "*": true },
      count: { "*": true },
      create: { requiresAuthentication: true },
      update: {},
      delete: { requiresAuthentication: true },
      addField: {},
    },
  },
  {
    name: "Block",
    fields: { blockerId: "String", blockedId: "String" },
    indexes: { unique: { blockerId: 1, blockedId: 1 } },
    clp: {
      find: { requiresAuthentication: true },
      get: { requiresAuthentication: true },
      count: {},
      create: { requiresAuthentication: true },
      update: {},
      delete: { requiresAuthentication: true },
      addField: {},
    },
  },
  {
    name: "ShopPost",
    fields: {
      shop: { type: "Pointer", targetClass: "Shop" },
      content: "String",
      image: "File",
    },
    indexes: { shop: { shop: 1, createdAt: -1 } },
    clp: PUBLIC_READ_USER_WRITE,
  },
  {
    name: "ShopStory",
    fields: {
      shop: { type: "Pointer", targetClass: "Shop" },
      media: "File",
      expiresAt: "Date",
    },
    indexes: { shop: { shop: 1, createdAt: -1 } },
    clp: PUBLIC_READ_USER_WRITE,
  },
  {
    name: "ShopStoryView",
    fields: {
      story: { type: "Pointer", targetClass: "ShopStory" },
      viewer: { type: "Pointer", targetClass: "_User" },
    },
    indexes: { unique: { story: 1, viewer: 1 } },
    clp: {
      find: { requiresAuthentication: true },
      get: { requiresAuthentication: true },
      count: { requiresAuthentication: true },
      create: { requiresAuthentication: true },
      update: {},
      delete: {},
      addField: {},
    },
  },
  {
    name: "Report",
    fields: {
      reporter: { type: "Pointer", targetClass: "_User" },
      targetType: "String",
      targetId: "String",
      reason: "String",
      status: "String",
    },
    indexes: { status: { status: 1, createdAt: -1 } },
    clp: {
      find: {},
      get: {},
      count: {},
      create: { requiresAuthentication: true },
      update: {},
      delete: {},
      addField: {},
    },
  },
];

async function applyClass(def) {
  const schema = new Parse.Schema(def.name);
  let existing = null;
  try {
    existing = await schema.get({ useMasterKey: true });
  } catch {
    // La classe n'existe pas encore : premier démarrage.
  }

  const known = new Set(Object.keys(existing?.fields ?? {}));

  for (const [field, type] of Object.entries(def.fields ?? {})) {
    if (known.has(field)) continue;
    if (typeof type === "string") schema.addField(field, type);
    else schema.addPointer(field, type.targetClass);
  }

  for (const [name, spec] of Object.entries(def.indexes ?? {})) {
    if (existing?.indexes?.[name]) continue;
    schema.addIndex(name, spec);
  }

  if (def.clp) schema.setCLP(def.clp);

  await (existing ? schema.update({ useMasterKey: true }) : schema.save({ useMasterKey: true }));
}

/**
 * Appliqué au démarrage, sans bloquer le boot : si une classe échoue, on veut
 * le voir dans les logs et garder le serveur debout pour les autres.
 */
async function ensureSchema() {
  for (const def of CLASSES) {
    try {
      await applyClass(def);
    } catch (err) {
      console.error(`[schema] ${def.name} :`, err.message);
    }
  }
  console.log(`[schema] ${CLASSES.length} classes vérifiées`);
}

ensureSchema();

module.exports = { CLASSES, ensureSchema };
