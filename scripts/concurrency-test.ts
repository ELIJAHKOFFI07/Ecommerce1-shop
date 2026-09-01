/**
 * Test de charge contre un vrai Postgres — pas des mocks.
 *
 * Vérifie exactement les points identifiés comme risqués dans
 * NEXTJS_BACKEND_MIGRATION.md : la non-survente sur commande concurrente,
 * la restitution de stock à l'annulation, la course d'enchères, les
 * retraits concurrents, et l'auto-achat interdit.
 *
 * Usage : npx tsx scripts/concurrency-test.ts
 * (DATABASE_URL doit pointer vers la base à tester — voir .env.local)
 */
import { db } from "../src/lib/db";
import { placeOrder } from "../src/lib/placeOrder";
import { placeBid } from "../src/lib/placeBid";
import { requestWithdrawal } from "../src/lib/requestWithdrawal";
import { applyOrderTransition } from "../src/lib/orderTransition";
import { TRANSACTION_OPTIONS } from "../src/lib/transactionOptions";
import bcrypt from "bcryptjs";

const RUN = Math.random().toString(36).slice(2, 8);
const results: { name: string; pass: boolean; detail?: string }[] = [];
const cleanupUserIds: string[] = [];

function record(name: string, pass: boolean, detail?: string) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "✓" : "✗"} ${name}${detail ? " — " + detail : ""}`);
}

async function createUser(username: string) {
  const passwordHash = await bcrypt.hash("Password123!", 10);
  const user = await db.user.create({
    data: { username, email: `${username}@test.local`, passwordHash },
  });
  await db.wallet.create({ data: { userId: user.id, balance: 0 } });
  cleanupUserIds.push(user.id);
  return user;
}

async function main() {
  console.log(`\n=== Test de charge — run ${RUN} ===\n`);

  const category = await db.category.create({ data: { name: "Test", slug: `test-${RUN}` } });
  const seller = await createUser(`seller_${RUN}`);
  const shop = await db.shop.create({ data: { ownerId: seller.id, name: `Boutique ${RUN}`, slug: `shop-${RUN}` } });

  const buyers = await Promise.all(
    Array.from({ length: 5 }, (_, i) => createUser(`buyer_${RUN}_${i}`)),
  );

  // -------------------------------------------------------------------
  // Test 1 — non-survente : 5 acheteurs, en parallèle, stock de 3
  // -------------------------------------------------------------------
  const stockProduct = await db.product.create({
    data: {
      shopId: shop.id,
      sellerId: seller.id,
      categoryId: category.id,
      title: `Produit stock limité ${RUN}`,
      price: 10000,
      stock: 3,
      status: "active",
    },
  });

  const orderAttempts = await Promise.allSettled(
    buyers.map((buyer) =>
      placeOrder(buyer.id, {
        items: [{ productId: stockProduct.id, quantity: 1 }],
        address: {},
        deliveryMethod: "pickup",
        paymentMethod: "cod",
      }),
    ),
  );

  const succeeded = orderAttempts.filter((r) => r.status === "fulfilled");
  const failed = orderAttempts.filter((r) => r.status === "rejected");
  for (const f of failed) {
    if (f.status === "rejected") console.log(`   → refus : ${f.reason instanceof Error ? f.reason.message : f.reason}`);
  }
  const finalStock = (await db.product.findUniqueOrThrow({ where: { id: stockProduct.id } })).stock;

  record(
    "Non-survente : exactement 3 commandes passent sur 5 envoyées en parallèle, stock jamais négatif",
    succeeded.length === 3 && failed.length === 2 && finalStock === 0,
    `${succeeded.length} réussies, ${failed.length} refusées, stock final ${finalStock}`,
  );

  // -------------------------------------------------------------------
  // Test 2 — un vendeur ne peut pas acheter ses propres produits
  // -------------------------------------------------------------------
  let selfPurchaseBlocked = false;
  try {
    await placeOrder(seller.id, {
      items: [{ productId: stockProduct.id, quantity: 1 }],
      address: {},
      deliveryMethod: "pickup",
      paymentMethod: "cod",
    });
  } catch (e) {
    selfPurchaseBlocked = e instanceof Error && e.message.includes("propres produits");
  }
  record("Auto-achat refusé", selfPurchaseBlocked);

  // -------------------------------------------------------------------
  // Test 3 — annulation restitue le stock
  // -------------------------------------------------------------------
  const cancelProduct = await db.product.create({
    data: {
      shopId: shop.id,
      sellerId: seller.id,
      categoryId: category.id,
      title: `Produit annulation ${RUN}`,
      price: 5000,
      stock: 2,
      status: "active",
    },
  });

  const [cancelOrderId] = await placeOrder(buyers[0].id, {
    items: [{ productId: cancelProduct.id, quantity: 1 }],
    address: {},
    deliveryMethod: "pickup",
    paymentMethod: "cod",
  });

  const stockAfterOrder = (await db.product.findUniqueOrThrow({ where: { id: cancelProduct.id } })).stock;
  const cancelOrder = await db.order.findUniqueOrThrow({ where: { id: cancelOrderId } });
  await db.$transaction((tx) => applyOrderTransition(tx, cancelOrder, "cancelled", undefined, "buyer"), TRANSACTION_OPTIONS);
  const stockAfterCancel = (await db.product.findUniqueOrThrow({ where: { id: cancelProduct.id } })).stock;

  record(
    "Annulation restitue le stock",
    stockAfterOrder === 1 && stockAfterCancel === 2,
    `après commande : ${stockAfterOrder}, après annulation : ${stockAfterCancel}`,
  );

  // -------------------------------------------------------------------
  // Test 4 — livraison : crédit du vendeur, commission déduite
  // -------------------------------------------------------------------
  const deliveryProduct = await db.product.create({
    data: {
      shopId: shop.id,
      sellerId: seller.id,
      categoryId: category.id,
      title: `Produit livraison ${RUN}`,
      price: 20000,
      stock: 1,
      status: "active",
    },
  });
  const [deliveryOrderId] = await placeOrder(buyers[1].id, {
    items: [{ productId: deliveryProduct.id, quantity: 1 }],
    address: {},
    deliveryMethod: "pickup",
    paymentMethod: "cod",
  });
  let deliveryOrder = await db.order.findUniqueOrThrow({ where: { id: deliveryOrderId } });
  await db.$transaction((tx) => applyOrderTransition(tx, deliveryOrder, "confirmed", undefined, "seller"), TRANSACTION_OPTIONS);
  deliveryOrder = await db.order.findUniqueOrThrow({ where: { id: deliveryOrderId } });
  await db.$transaction((tx) => applyOrderTransition(tx, deliveryOrder, "preparing", undefined, "seller"), TRANSACTION_OPTIONS);
  deliveryOrder = await db.order.findUniqueOrThrow({ where: { id: deliveryOrderId } });
  await db.$transaction((tx) => applyOrderTransition(tx, deliveryOrder, "shipped", undefined, "seller"), TRANSACTION_OPTIONS);
  deliveryOrder = await db.order.findUniqueOrThrow({ where: { id: deliveryOrderId } });

  const walletBefore = (await db.wallet.findUniqueOrThrow({ where: { userId: seller.id } })).balance;
  await db.$transaction(
    (tx) => applyOrderTransition(tx, deliveryOrder, "delivered", "Confirmée pour le test", "seller"),
    TRANSACTION_OPTIONS,
  );
  const walletAfter = (await db.wallet.findUniqueOrThrow({ where: { userId: seller.id } })).balance;

  record(
    "Livraison confirmée : commission déduite, portefeuille crédité",
    walletAfter > walletBefore && walletAfter - walletBefore < 20000,
    `+${walletAfter - walletBefore} FCFA (commande à 20000)`,
  );

  // -------------------------------------------------------------------
  // Test 5 — course d'enchères : 5 mises identiques et simultanées,
  // une seule doit passer (FOR UPDATE sur la ligne Auction)
  // -------------------------------------------------------------------
  const auctionProduct = await db.product.create({
    data: {
      shopId: shop.id,
      sellerId: seller.id,
      categoryId: category.id,
      title: `Produit enchère ${RUN}`,
      price: 50000,
      stock: 1,
      status: "active",
    },
  });
  const auction = await db.auction.create({
    data: {
      productId: auctionProduct.id,
      shopId: shop.id,
      startingPrice: 1000,
      status: "active",
      endsAt: new Date(Date.now() + 24 * 3600 * 1000),
    },
  });

  const bidAttempts = await Promise.allSettled(buyers.map((buyer) => placeBid(buyer.id, auction.id, 1050)));
  const bidSucceeded = bidAttempts.filter((r) => r.status === "fulfilled");
  const bidRows = await db.bid.findMany({ where: { auctionId: auction.id } });
  const finalAuction = await db.auction.findUniqueOrThrow({ where: { id: auction.id } });

  record(
    "Course d'enchères : une seule mise identique passe, état cohérent",
    bidSucceeded.length === 1 && bidRows.length === 1 && finalAuction.currentBid === 1050,
    `${bidSucceeded.length} mise(s) acceptée(s) sur 5 envoyées en parallèle, currentBid=${finalAuction.currentBid}`,
  );

  // -------------------------------------------------------------------
  // Test 6 — retraits concurrents : jamais plus que le solde réel
  // -------------------------------------------------------------------
  const balanceBeforeWithdrawals = walletAfter;
  const perWithdrawal = Math.max(Math.floor(balanceBeforeWithdrawals / 2) - 500, 5000);

  const withdrawAttempts = await Promise.allSettled(
    [1, 2, 3].map(() => requestWithdrawal(seller.id, perWithdrawal, "0700000000")),
  );
  const withdrawSucceeded = withdrawAttempts.filter((r) => r.status === "fulfilled");
  const finalWallet = await db.wallet.findUniqueOrThrow({ where: { userId: seller.id } });

  record(
    "Retraits concurrents : jamais plus que le solde réel, jamais négatif",
    finalWallet.balance >= 0 &&
      finalWallet.balance === balanceBeforeWithdrawals - withdrawSucceeded.length * perWithdrawal,
    `${withdrawSucceeded.length} retrait(s) de ${perWithdrawal} FCFA accepté(s) sur 3 tentés en parallèle (solde de départ ${balanceBeforeWithdrawals}), solde final ${finalWallet.balance}`,
  );

  // -------------------------------------------------------------------
  // Nettoyage — Order.buyer n'a pas onDelete: Cascade (on ne supprime pas
  // l'historique de commandes juste parce qu'un compte est supprimé), donc
  // il faut nettoyer dans l'ordre plutôt que compter sur la cascade depuis
  // User.
  // -------------------------------------------------------------------
  console.log("\nNettoyage…");
  const orders = await db.order.findMany({ where: { buyerId: { in: cleanupUserIds } }, select: { id: true } });
  const orderIds = orders.map((o) => o.id);
  await db.walletTransaction.deleteMany({ where: { OR: [{ walletUserId: { in: cleanupUserIds } }, { orderId: { in: orderIds } }] } });
  await db.orderEvent.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.order.deleteMany({ where: { id: { in: orderIds } } });
  await db.bid.deleteMany({ where: { bidderId: { in: cleanupUserIds } } });
  await db.auction.deleteMany({ where: { shopId: shop.id } });
  await db.notification.deleteMany({ where: { userId: { in: cleanupUserIds } } });
  await db.product.deleteMany({ where: { shopId: shop.id } });
  await db.wallet.deleteMany({ where: { userId: { in: cleanupUserIds } } });
  await db.shop.deleteMany({ where: { id: shop.id } });
  await db.user.deleteMany({ where: { id: { in: cleanupUserIds } } });
  await db.category.deleteMany({ where: { id: category.id } });

  const failedTests = results.filter((r) => !r.pass);
  console.log(`\n=== ${results.length - failedTests.length}/${results.length} tests passés ===\n`);
  if (failedTests.length) {
    console.log("Échecs :");
    for (const f of failedTests) console.log(`  - ${f.name}${f.detail ? " (" + f.detail + ")" : ""}`);
  }
  process.exit(failedTests.length ? 1 : 0);
}

main()
  .catch((err) => {
    console.error("\nErreur inattendue :", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
