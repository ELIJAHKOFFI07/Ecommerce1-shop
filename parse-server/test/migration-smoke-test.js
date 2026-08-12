/**
 * Test de bout en bout contre un Parse Server réel — pas des mocks.
 *
 * Vérifie exactement les points identifiés comme risqués dans
 * PARSE_MIGRATION.md §1 : la non-survente sur commande concurrente, la
 * restitution de stock à l'annulation, le code de retrait qui ne fuite
 * jamais vers le client, la course d'enchères, les retraits concurrents qui
 * ne dépassent jamais le solde réel, et l'auto-achat interdit.
 *
 * Chaque appel passe un `sessionToken` explicite plutôt que de s'appuyer sur
 * Parse.User.logIn/logOut : le SDK garde un « utilisateur courant » global
 * unique par process, ce qui casserait exactement les tests de concurrence
 * qu'on cherche à vérifier — cinq connexions lancées en parallèle se
 * marcheraient dessus et le mauvais acheteur se retrouverait authentifié
 * pour l'appel d'un autre.
 *
 * Usage (depuis parse-server/, .env déjà rempli) :
 *   docker run --rm -it \
 *     --network parse-server_default \
 *     -v "$(pwd)/test:/app" -w /app \
 *     --env-file ../.env \
 *     -e PARSE_SERVER_URL_INTERNAL=http://parse:1337/parse \
 *     node:20-alpine sh -c "npm install parse --no-audit --no-fund --silent && node migration-smoke-test.js"
 *
 * Tourne dans le réseau Docker du compose (nom de service "parse"), pas via
 * l'URL publique : plus rapide, et fonctionne même sans domaine/TLS.
 */

const Parse = require("parse/node");

const APP_ID = process.env.PARSE_APP_ID;
const JS_KEY = process.env.PARSE_JS_KEY;
const MASTER_KEY = process.env.PARSE_MASTER_KEY;
const SERVER_URL = process.env.PARSE_SERVER_URL_INTERNAL || "http://parse:1337/parse";

if (!APP_ID || !JS_KEY || !MASTER_KEY) {
  console.error("PARSE_APP_ID, PARSE_JS_KEY et PARSE_MASTER_KEY doivent être dans l'environnement (--env-file ../.env).");
  process.exit(1);
}

Parse.initialize(APP_ID, JS_KEY, MASTER_KEY);
Parse.serverURL = SERVER_URL;

const RUN = Math.random().toString(36).slice(2, 8);
const results = [];
const cleanup = []; // objets à supprimer à la fin (master key)

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "✓" : "✗"} ${name}${detail ? " — " + detail : ""}`);
}

/** Inscrit un utilisateur et renvoie {user, sessionToken} sans toucher à
 *  l'état global du SDK (signUp connecte automatiquement l'utilisateur créé
 *  comme "current user" — on récupère juste son token et on l'ignore ensuite). */
async function signUp(username, password, email) {
  const user = await Parse.User.signUp(username, password, { email });
  return { user, sessionToken: user.getSessionToken() };
}

async function createShop(name, sessionToken) {
  const shop = new Parse.Object("Shop");
  shop.set("name", name);
  shop.set("city", "Abidjan");
  await shop.save(null, { sessionToken }); // beforeSave("Shop") doit prendre owner = ce compte
  cleanup.push(shop);
  return shop;
}

async function createProduct({ shop, title, price, stock, category, sessionToken }) {
  const product = new Parse.Object("Product");
  product.set("title", title);
  product.set("price", price);
  product.set("stock", stock);
  product.set("status", "active");
  product.set("shop", shop);
  if (category) product.set("category", category);
  await product.save(null, { sessionToken }); // beforeSave("Product") doit fixer seller + ACL
  cleanup.push(product);
  return product;
}

async function main() {
  console.log(`\n=== Test de migration Parse — run ${RUN} ===\n`);
  console.log(`Serveur : ${SERVER_URL}\n`);

  // -------------------------------------------------------------------
  // Préparatifs : catégorie, vendeur, boutique, cinq acheteurs
  // -------------------------------------------------------------------
  const category = new Parse.Object("Category");
  category.set("name", "Test");
  category.set("slug", `test-${RUN}`);
  await category.save(null, { useMasterKey: true });
  cleanup.push(category);

  const { user: seller, sessionToken: sellerToken } = await signUp(
    `seller_${RUN}`,
    "Password123!",
    `seller-${RUN}@test.local`,
  );
  record("Inscription vendeur (handle_new_user)", true);

  const wallet = await new Parse.Query("Wallet")
    .equalTo("owner", seller)
    .first({ useMasterKey: true });
  record(
    "Portefeuille créé automatiquement à l'inscription",
    Boolean(wallet) && wallet.get("balance") === 0,
    wallet ? `solde initial ${wallet.get("balance")}` : "aucun portefeuille trouvé",
  );
  record(
    "Code de parrainage généré à l'inscription",
    Boolean(seller.get("referralCode")),
    seller.get("referralCode"),
  );

  const shop = await createShop(`Boutique Test ${RUN}`, sellerToken);
  const shopFetched = await new Parse.Query("Shop").get(shop.id, { useMasterKey: true });
  record("on_shop_created : owner correctement assigné", shopFetched.get("owner")?.id === seller.id);

  const hasSellerRole = await new Parse.Query(Parse.Role)
    .equalTo("name", "seller")
    .equalTo("users", seller)
    .first({ useMasterKey: true });
  record("on_shop_created : rôle seller accordé", Boolean(hasSellerRole));

  const buyers = [];
  for (let i = 0; i < 5; i++) {
    buyers.push(await signUp(`buyer_${RUN}_${i}`, "Password123!", `buyer-${RUN}-${i}@test.local`));
  }

  // -------------------------------------------------------------------
  // Test 1 — non-survente : 5 acheteurs, en parallèle, stock de 3
  // -------------------------------------------------------------------
  const stockProduct = await createProduct({
    shop,
    title: `Produit stock limité ${RUN}`,
    price: 10000,
    stock: 3,
    category,
    sessionToken: sellerToken,
  });

  const orderAttempts = await Promise.allSettled(
    buyers.map(({ sessionToken }) =>
      Parse.Cloud.run(
        "placeOrder",
        {
          items: [{ productId: stockProduct.id, quantity: 1 }],
          address: { city: "Abidjan" },
          zoneId: null,
          deliveryMethod: "pickup",
          paymentMethod: "cod",
        },
        { sessionToken },
      ),
    ),
  );

  const succeeded = orderAttempts.filter((r) => r.status === "fulfilled");
  const failed = orderAttempts.filter((r) => r.status === "rejected");
  const finalStock = (await new Parse.Query("Product").get(stockProduct.id, { useMasterKey: true })).get("stock");

  record(
    "Non-survente : exactement 3 commandes passent sur 5 envoyées en parallèle, stock jamais négatif",
    succeeded.length === 3 && failed.length === 2 && finalStock === 0,
    `${succeeded.length} réussies, ${failed.length} refusées, stock final ${finalStock}`,
  );

  const orderIds = succeeded.flatMap((r) => r.value.orderIds);
  for (const id of orderIds) cleanup.push(Parse.Object.extend("Order").createWithoutData(id));

  // -------------------------------------------------------------------
  // Test 2 — un vendeur ne peut pas acheter ses propres produits
  // -------------------------------------------------------------------
  let selfPurchaseBlocked = false;
  try {
    await Parse.Cloud.run(
      "placeOrder",
      {
        items: [{ productId: stockProduct.id, quantity: 1 }],
        address: {},
        zoneId: null,
        deliveryMethod: "pickup",
        paymentMethod: "cod",
      },
      { sessionToken: sellerToken },
    );
  } catch (e) {
    selfPurchaseBlocked = e.message.includes("propres produits");
  }
  record("Auto-achat refusé", selfPurchaseBlocked);

  // -------------------------------------------------------------------
  // Test 3 — annulation restitue le stock
  // -------------------------------------------------------------------
  const cancelProduct = await createProduct({
    shop,
    title: `Produit annulation ${RUN}`,
    price: 5000,
    stock: 2,
    category,
    sessionToken: sellerToken,
  });

  const cancelOrderRes = await Parse.Cloud.run(
    "placeOrder",
    {
      items: [{ productId: cancelProduct.id, quantity: 1 }],
      address: {},
      zoneId: null,
      deliveryMethod: "pickup",
      paymentMethod: "cod",
    },
    { sessionToken: buyers[0].sessionToken },
  );
  const cancelOrderId = cancelOrderRes.orderIds[0];
  cleanup.push(Parse.Object.extend("Order").createWithoutData(cancelOrderId));

  const stockAfterOrder = (await new Parse.Query("Product").get(cancelProduct.id, { useMasterKey: true })).get("stock");
  await Parse.Cloud.run(
    "advanceOrderStatus",
    { orderId: cancelOrderId, status: "cancelled" },
    { sessionToken: buyers[0].sessionToken },
  );
  const stockAfterCancel = (await new Parse.Query("Product").get(cancelProduct.id, { useMasterKey: true })).get("stock");

  record(
    "Annulation restitue le stock",
    stockAfterOrder === 1 && stockAfterCancel === 2,
    `après commande : ${stockAfterOrder}, après annulation : ${stockAfterCancel}`,
  );

  // -------------------------------------------------------------------
  // Test 4 — code de retrait : jamais lisible par le client, machine à
  // états unique (confirmDelivery délègue à advanceOrderStatus)
  // -------------------------------------------------------------------
  const deliveryProduct = await createProduct({
    shop,
    title: `Produit livraison ${RUN}`,
    price: 20000,
    stock: 1,
    category,
    sessionToken: sellerToken,
  });

  const deliveryOrderRes = await Parse.Cloud.run(
    "placeOrder",
    {
      items: [{ productId: deliveryProduct.id, quantity: 1 }],
      address: {},
      zoneId: null,
      deliveryMethod: "pickup",
      paymentMethod: "cod",
    },
    { sessionToken: buyers[1].sessionToken },
  );
  const deliveryOrderId = deliveryOrderRes.orderIds[0];
  cleanup.push(Parse.Object.extend("Order").createWithoutData(deliveryOrderId));

  let codeReadableByBuyer = false;
  try {
    const rows = await new Parse.Query("OrderPickupCode")
      .equalTo("order", Parse.Object.extend("Order").createWithoutData(deliveryOrderId))
      .find({ sessionToken: buyers[1].sessionToken });
    codeReadableByBuyer = rows.length > 0;
  } catch {
    codeReadableByBuyer = false; // CLP vide : Parse répond par une liste vide ou une erreur, les deux sont "invisible"
  }
  record("Code de retrait invisible pour le client (CLP vide)", !codeReadableByBuyer);

  await Parse.Cloud.run(
    "advanceOrderStatus",
    { orderId: deliveryOrderId, status: "confirmed" },
    { sessionToken: sellerToken },
  );
  await Parse.Cloud.run(
    "advanceOrderStatus",
    { orderId: deliveryOrderId, status: "preparing" },
    { sessionToken: sellerToken },
  );
  await Parse.Cloud.run(
    "advanceOrderStatus",
    { orderId: deliveryOrderId, status: "shipped" },
    { sessionToken: sellerToken },
  );

  let wrongCodeRejected = false;
  try {
    await Parse.Cloud.run(
      "confirmDelivery",
      { orderId: deliveryOrderId, code: "000000" },
      { sessionToken: sellerToken },
    );
  } catch (e) {
    wrongCodeRejected = e.message.includes("incorrect");
  }
  record("Code de retrait incorrect refusé", wrongCodeRejected);

  const realCode = (
    await new Parse.Query("OrderPickupCode")
      .equalTo("order", Parse.Object.extend("Order").createWithoutData(deliveryOrderId))
      .first({ useMasterKey: true })
  ).get("code");

  const sellerWalletBefore = (
    await new Parse.Query("Wallet").equalTo("owner", seller).first({ useMasterKey: true })
  ).get("balance");

  await Parse.Cloud.run(
    "confirmDelivery",
    { orderId: deliveryOrderId, code: realCode },
    { sessionToken: sellerToken },
  );

  const sellerWalletAfter = (
    await new Parse.Query("Wallet").equalTo("owner", seller).first({ useMasterKey: true })
  ).get("balance");

  record(
    "Livraison confirmée : commission déduite, portefeuille crédité",
    sellerWalletAfter > sellerWalletBefore && sellerWalletAfter - sellerWalletBefore < 20000,
    `+${sellerWalletAfter - sellerWalletBefore} FCFA (commande à 20000)`,
  );

  // -------------------------------------------------------------------
  // Test 5 — course d'enchères : 5 mises identiques et simultanées,
  // une seule doit passer (garde-fou beforeSave sur Auction)
  // -------------------------------------------------------------------
  const auctionProduct = await createProduct({
    shop,
    title: `Produit enchère ${RUN}`,
    price: 50000,
    stock: 1,
    category,
    sessionToken: sellerToken,
  });
  const auction = await Parse.Cloud.run(
    "createAuction",
    { productId: auctionProduct.id, startingPrice: 1000, durationHours: 24 },
    { sessionToken: sellerToken },
  );
  cleanup.push(Parse.Object.extend("Auction").createWithoutData(auction.id));

  const bidAttempts = await Promise.allSettled(
    buyers.map(({ sessionToken }) =>
      Parse.Cloud.run("placeBid", { auctionId: auction.id, amount: 1050 }, { sessionToken }),
    ),
  );

  const bidSucceeded = bidAttempts.filter((r) => r.status === "fulfilled");
  const bidRows = await new Parse.Query("Bid")
    .equalTo("auction", Parse.Object.extend("Auction").createWithoutData(auction.id))
    .find({ useMasterKey: true });
  const finalAuction = await new Parse.Query("Auction").get(auction.id, { useMasterKey: true });

  record(
    "Course d'enchères : une seule mise identique passe, état cohérent",
    bidSucceeded.length === 1 && bidRows.length === 1 && finalAuction.get("currentBid") === 1050,
    `${bidSucceeded.length} mise(s) acceptée(s) sur 5 envoyées en parallèle, currentBid=${finalAuction.get("currentBid")}`,
  );

  // -------------------------------------------------------------------
  // Test 6 — retraits concurrents : jamais plus que le solde réel
  //
  // Même famille de bug que le stock (voir lock.js) : requestWithdrawal
  // décrémente un solde avec un plancher. Trois retraits dont deux seulement
  // devraient passer au vu du solde réel (crédité au test 4).
  // -------------------------------------------------------------------
  const balanceBeforeWithdrawals = sellerWalletAfter;
  const perWithdrawal = Math.max(Math.floor(balanceBeforeWithdrawals / 2) - 500, 5000);

  const withdrawAttempts = await Promise.allSettled(
    [1, 2, 3].map(() =>
      Parse.Cloud.run(
        "requestWithdrawal",
        { amount: perWithdrawal, phone: "0700000000" },
        { sessionToken: sellerToken },
      ),
    ),
  );
  const withdrawSucceeded = withdrawAttempts.filter((r) => r.status === "fulfilled");
  const finalWallet = await new Parse.Query("Wallet").equalTo("owner", seller).first({ useMasterKey: true });

  record(
    "Retraits concurrents : jamais plus que le solde réel, jamais négatif",
    finalWallet.get("balance") >= 0 &&
      finalWallet.get("balance") === balanceBeforeWithdrawals - withdrawSucceeded.length * perWithdrawal,
    `${withdrawSucceeded.length} retrait(s) de ${perWithdrawal} FCFA accepté(s) sur 3 tentés en parallèle (solde de départ ${balanceBeforeWithdrawals}), solde final ${finalWallet.get("balance")}`,
  );

  // -------------------------------------------------------------------
  // Nettoyage
  // -------------------------------------------------------------------
  console.log("\nNettoyage…");
  for (const obj of cleanup.reverse()) {
    await obj.destroy({ useMasterKey: true }).catch(() => {});
  }
  for (const { user } of buyers) await user.destroy({ useMasterKey: true }).catch(() => {});
  await seller.destroy({ useMasterKey: true }).catch(() => {});

  // -------------------------------------------------------------------
  // Résumé
  // -------------------------------------------------------------------
  const failedTests = results.filter((r) => !r.pass);
  console.log(`\n=== ${results.length - failedTests.length}/${results.length} tests passés ===\n`);
  if (failedTests.length) {
    console.log("Échecs :");
    for (const f of failedTests) console.log(`  - ${f.name}${f.detail ? " (" + f.detail + ")" : ""}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("\nErreur inattendue :", err);
  process.exit(1);
});
