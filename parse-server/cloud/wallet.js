/**
 * Portefeuille et récompenses — équivalent de request_withdrawal,
 * redeem_points, spin_wheel, boost_product.
 *
 * Même garde-fou que le stock (hooks.js) : `increment()` atomique plus un
 * `beforeSave` qui refuse un solde négatif. C'est ce qui remplace le
 * `select … for update` de request_withdrawal et boost_product.
 */
Parse.Cloud.beforeSave("Wallet", (request) => {
  const balance = request.object.get("balance");
  if (typeof balance === "number" && balance < 0) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Solde insuffisant");
  }
});

async function getWallet(user) {
  const wallet = await new Parse.Query("Wallet").equalTo("owner", user).first({ useMasterKey: true });
  if (!wallet) throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Portefeuille introuvable");
  return wallet;
}

/**
 * requestWithdrawal — équivalent de request_withdrawal.
 * params: { amount, phone }
 */
Parse.Cloud.define("requestWithdrawal", async (request) => {
  const user = request.user;
  if (!user) throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Non connecté");

  const { amount, phone } = request.params;
  const { minWithdrawal } = await loadSettings();
  if (amount < minWithdrawal) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, `Retrait minimum : ${minWithdrawal} FCFA`);
  }

  const wallet = await getWallet(user);
  wallet.increment("balance", -amount);
  // Le beforeSave rejette ce save si le solde passe sous zéro.
  await wallet.save(null, { useMasterKey: true });

  const tx = new Parse.Object("WalletTransaction");
  tx.set("wallet", wallet);
  tx.set("amount", -amount);
  tx.set("kind", "withdrawal");
  tx.set("reference", `Vers ${phone}`);
  await tx.save(null, { useMasterKey: true });

  return { ok: true };
});

/** Reprend platform_settings, avec les mêmes valeurs par défaut que le schéma SQL. */
async function loadSettings() {
  const settings = await new Parse.Query("PlatformSettings").first({ useMasterKey: true });
  return {
    commissionPercent: settings?.get("commissionPercent") ?? 5,
    minWithdrawal: settings?.get("minWithdrawal") ?? 5000,
  };
}

/**
 * redeemPoints — équivalent de redeem_points.
 * Barème : 1 point = 10 FCFA, minimum 50 points. Produit un coupon personnel
 * à usage unique.
 * params: { points }
 */
Parse.Cloud.define("redeemPoints", async (request) => {
  const user = request.user;
  if (!user) throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Non connecté");

  const { points } = request.params;
  if (points < 50) throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Minimum 50 points");

  const fresh = await user.fetch({ useMasterKey: true });
  const balance = fresh.get("loyaltyPoints") ?? 0;
  if (balance < points) throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Points insuffisants");

  const code = "PTS" + require("crypto").randomBytes(4).toString("hex").toUpperCase().slice(0, 7);

  fresh.increment("loyaltyPoints", -points);
  await fresh.save(null, { useMasterKey: true });

  const coupon = new Parse.Object("Coupon");
  coupon.set("code", code);
  coupon.set("type", "fixed");
  coupon.set("value", points * 10);
  coupon.set("minOrderAmount", 0);
  coupon.set("maxUses", 1);
  coupon.set("usedCount", 0);
  coupon.set("active", true);
  await coupon.save(null, { useMasterKey: true });

  return { code };
});

/**
 * spinWheel — équivalent de spin_wheel.
 * Un tirage par jour. Barème identique à la version Postgres : le tirage est
 * décidé ici, jamais par le client.
 * params: aucun
 */
Parse.Cloud.define("spinWheel", async (request) => {
  const user = request.user;
  if (!user) throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Non connecté");

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const already = await new Parse.Query("SpinReward")
    .equalTo("user", user)
    .greaterThanOrEqualTo("createdAt", startOfDay)
    .first({ useMasterKey: true });
  if (already) throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Déjà joué aujourd'hui");

  const roll = Math.random() * 100;
  let kind, value, code;
  if (roll < 40) {
    kind = "nothing";
    value = 0;
  } else if (roll < 70) {
    kind = "points";
    value = 10;
  } else if (roll < 90) {
    kind = "points";
    value = 50;
  } else if (roll < 98) {
    kind = "coupon";
    value = 5;
    code = "SPIN" + require("crypto").randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
  } else {
    kind = "coupon";
    value = 15;
    code = "SPIN" + require("crypto").randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
  }

  if (kind === "points") {
    const fresh = await user.fetch({ useMasterKey: true });
    fresh.increment("loyaltyPoints", value);
    await fresh.save(null, { useMasterKey: true });
  } else if (kind === "coupon") {
    const coupon = new Parse.Object("Coupon");
    coupon.set("code", code);
    coupon.set("type", "percent");
    coupon.set("value", value);
    coupon.set("minOrderAmount", 0);
    coupon.set("maxUses", 1);
    coupon.set("usedCount", 0);
    coupon.set("active", true);
    await coupon.save(null, { useMasterKey: true });
  }

  const reward = new Parse.Object("SpinReward");
  reward.set("user", user);
  reward.set("prizeKind", kind);
  reward.set("prizeValue", value);
  if (code) reward.set("couponCode", code);
  await reward.save(null, { useMasterKey: true });

  return reward;
});

/**
 * boostProduct — équivalent de boost_product.
 * Tarifs fixes par durée, débités du portefeuille du vendeur.
 * params: { productId, hours: 24 | 72 | 168 }
 */
Parse.Cloud.define("boostProduct", async (request) => {
  const user = request.user;
  if (!user) throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Non connecté");

  const { productId, hours } = request.params;
  const cost = { 24: 500, 72: 1200, 168: 2500 }[hours];
  if (!cost) throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Durée invalide (24, 72 ou 168 h)");

  const product = await new Parse.Query("Product")
    .include("shop")
    .get(productId, { useMasterKey: true })
    .catch(() => null);
  if (!product || product.get("shop")?.get("owner")?.id !== user.id) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Produit introuvable");
  }

  const wallet = await getWallet(user);
  wallet.increment("balance", -cost);
  await wallet.save(null, { useMasterKey: true });

  const tx = new Parse.Object("WalletTransaction");
  tx.set("wallet", wallet);
  tx.set("amount", -cost);
  tx.set("kind", "withdrawal");
  tx.set("reference", "Mise en avant produit");
  await tx.save(null, { useMasterKey: true });

  const boost = new Parse.Object("ProductBoost");
  boost.set("product", product);
  boost.set("shop", product.get("shop"));
  boost.set("cost", cost);
  boost.set("startsAt", new Date());
  boost.set("endsAt", new Date(Date.now() + hours * 3600 * 1000));
  await boost.save(null, { useMasterKey: true });

  return boost;
});

module.exports = { loadSettings };
