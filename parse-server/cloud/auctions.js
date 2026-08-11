/**
 * Enchères — équivalent de create_auction / place_bid / settle_expired_auctions.
 *
 * `place_bid` verrouillait la ligne (`for update`) pour que deux enchères
 * simultanées ne valident jamais toutes les deux sur la même base. Parse n'a
 * pas ce verrou : le garde-fou ci-dessous s'appuie sur `request.original`,
 * que Parse fournit dans `beforeSave` sur une mise à jour — c'est la valeur
 * telle qu'elle est **au moment du save**, pas celle lue en début de requête.
 * Une écriture qui ferait reculer `currentBid` est donc rejetée même si deux
 * enchères ont été acceptées presque en même temps côté Cloud Function.
 */
Parse.Cloud.beforeSave("Auction", (request) => {
  if (!request.original) return; // création : rien à comparer
  const previous = request.original.get("currentBid") ?? 0;
  const next = request.object.get("currentBid");
  if (next != null && next <= previous && request.object.dirty("currentBid")) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Enchère déjà dépassée, réessayez");
  }
});

/**
 * createAuction — équivalent de create_auction.
 * params: { productId, startingPrice, durationHours: 24 | 72 | 168 }
 */
Parse.Cloud.define("createAuction", async (request) => {
  const user = request.user;
  if (!user) throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Non connecté");

  const { productId, startingPrice, durationHours } = request.params;
  if (startingPrice < 100) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Prix de départ minimum : 100 FCFA");
  }
  if (![24, 72, 168].includes(durationHours)) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Durée invalide (24, 72 ou 168 h)");
  }

  const product = await new Parse.Query("Product")
    .equalTo("status", "active")
    .include("shop")
    .get(productId, { useMasterKey: true })
    .catch(() => null);
  if (!product || product.get("shop")?.get("owner")?.id !== user.id) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Produit introuvable");
  }

  const already = await new Parse.Query("Auction")
    .equalTo("product", product)
    .equalTo("status", "active")
    .first({ useMasterKey: true });
  if (already) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Une enchère est déjà en cours sur ce produit");
  }

  const auction = new Parse.Object("Auction");
  auction.set("product", product);
  auction.set("startingPrice", startingPrice);
  auction.set("status", "active");
  auction.set("endsAt", new Date(Date.now() + durationHours * 3600 * 1000));

  const acl = new Parse.ACL();
  acl.setPublicReadAccess(true);
  acl.setRoleWriteAccess("admin", true);
  auction.setACL(acl);

  await auction.save(null, { useMasterKey: true });
  return auction;
});

/**
 * placeBid — équivalent de place_bid.
 *
 * Surenchère minimale +5 %. Anti-sniping : une enchère dans les deux
 * dernières minutes prolonge la fin de deux minutes.
 * params: { auctionId, amount }
 */
Parse.Cloud.define("placeBid", async (request) => {
  const user = request.user;
  if (!user) throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Non connecté");

  const { auctionId, amount } = request.params;
  const auction = await new Parse.Query("Auction")
    .include("product")
    .get(auctionId, { useMasterKey: true });

  if (auction.get("status") !== "active" || auction.get("endsAt") <= new Date()) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Enchère terminée");
  }

  const product = await auction.get("product").fetch({ useMasterKey: true });
  const shop = await product.get("shop").fetch({ useMasterKey: true });
  if (shop.get("owner")?.id === user.id) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Vous êtes le vendeur");
  }

  const currentBid = auction.get("currentBid");
  const min = currentBid ? Math.ceil(currentBid * 1.05) : auction.get("startingPrice");
  if (amount < min) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, `Enchère minimum : ${min} FCFA`);
  }

  const previousBidder = auction.get("currentBidder");

  const bid = new Parse.Object("Bid");
  bid.set("auction", auction);
  bid.set("bidder", user);
  bid.set("amount", amount);
  await bid.save(null, { useMasterKey: true });

  auction.set("currentBid", amount);
  auction.set("currentBidder", user);
  auction.increment("bidsCount", 1);
  const remaining = auction.get("endsAt").getTime() - Date.now();
  if (remaining < 2 * 60 * 1000) {
    auction.set("endsAt", new Date(Date.now() + 2 * 60 * 1000));
  }
  // Le beforeSave ci-dessus rejette cet appel si une autre enchère a été
  // acceptée entre-temps avec un montant supérieur ou égal.
  await auction.save(null, { useMasterKey: true });

  if (previousBidder && previousBidder.id !== user.id) {
    const notification = new Parse.Object("Notification");
    notification.set("user", previousBidder);
    notification.set("type", "auction");
    notification.set("title", "Vous avez été surenchéri !");
    notification.set("body", `Nouvelle offre de ${amount} FCFA — réagissez vite.`);
    notification.set("data", { auctionId: auction.id, productId: product.id });
    await notification.save(null, { useMasterKey: true });
  }

  return auction;
});

/**
 * settleExpiredAuctions — équivalent de settle_expired_auctions.
 *
 * Côté Postgres, c'était une clôture paresseuse appelée à l'affichage : pas
 * besoin de cron pour le MVP. Parse a un vrai ordonnanceur de jobs
 * (`Parse.Cloud.job`, plannifiable depuis le Dashboard) — autant s'en servir
 * plutôt que de dépendre du trafic pour clôturer les enchères à temps.
 */
async function settleExpiredAuctions() {
  const expired = await new Parse.Query("Auction")
    .equalTo("status", "active")
    .lessThanOrEqualTo("endsAt", new Date())
    .include("product")
    .find({ useMasterKey: true });

  for (const auction of expired) {
    auction.set("status", "ended");
    await auction.save(null, { useMasterKey: true });

    const winner = auction.get("currentBidder");
    if (!winner) continue;

    const product = await auction.get("product").fetch({ useMasterKey: true });
    const shop = await product.get("shop").fetch({ useMasterKey: true });
    const title = product.get("title");
    const finalBid = auction.get("currentBid");

    const winnerNotif = new Parse.Object("Notification");
    winnerNotif.set("user", winner);
    winnerNotif.set("type", "auction");
    winnerNotif.set("title", "Enchère remportée ! 🎉");
    winnerNotif.set(
      "body",
      `Vous remportez « ${title} » pour ${finalBid} FCFA. Contactez le vendeur pour finaliser.`,
    );
    winnerNotif.set("data", { auctionId: auction.id, productId: product.id });
    await winnerNotif.save(null, { useMasterKey: true });

    const sellerNotif = new Parse.Object("Notification");
    sellerNotif.set("user", shop.get("owner"));
    sellerNotif.set("type", "auction");
    sellerNotif.set("title", "Votre enchère est terminée");
    sellerNotif.set("body", `« ${title} » part à ${finalBid} FCFA.`);
    sellerNotif.set("data", { auctionId: auction.id, productId: product.id });
    await sellerNotif.save(null, { useMasterKey: true });
  }

  return expired.length;
}

Parse.Cloud.define("settleExpiredAuctions", async () => ({ settled: await settleExpiredAuctions() }));

// Filet de sécurité si personne ne consulte les enchères pendant un moment :
// à planifier toutes les minutes depuis le Dashboard Parse (Cloud Code > Jobs).
Parse.Cloud.job("settleExpiredAuctions", async () => {
  await settleExpiredAuctions();
});
