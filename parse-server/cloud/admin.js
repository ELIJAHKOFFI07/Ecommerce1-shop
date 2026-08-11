/**
 * Back-office — équivalent de admin_stats, admin_wallets_overview,
 * admin_shop_revenue, admin_revenue_report, admin_update_settings,
 * admin_adjust_stock, admin_update_profile, admin_require_password_change,
 * clear_password_change_flag, shop_stats.
 */

const { requireAdmin } = require("./roles");

Parse.Cloud.define("adminStats", async (request) => {
  await requireAdmin(request);

  const [users, shops, activeProducts, orders, deliveredOrders, openReports] = await Promise.all([
    new Parse.Query(Parse.User).count({ useMasterKey: true }),
    new Parse.Query("Shop").count({ useMasterKey: true }),
    new Parse.Query("Product").equalTo("status", "active").count({ useMasterKey: true }),
    new Parse.Query("Order").count({ useMasterKey: true }),
    new Parse.Query("Order").equalTo("status", "delivered").find({ useMasterKey: true }),
    new Parse.Query("Report").equalTo("status", "open").count({ useMasterKey: true }),
  ]);

  const gmv = deliveredOrders.reduce((sum, o) => sum + (o.get("total") ?? 0), 0);

  return { users, shops, products: activeProducts, orders, gmv, openReports };
});

/**
 * Regroupe en mémoire — même remarque que referralLeaderboard : suffisant à
 * l'échelle MVP, à remplacer par une aggregation pipeline si le volume de
 * commandes grossit sensiblement.
 */
Parse.Cloud.define("adminWalletsOverview", async (request) => {
  await requireAdmin(request);

  const wallets = await new Parse.Query("Wallet").include("owner").find({ useMasterKey: true });
  const transactions = await new Parse.Query("WalletTransaction")
    .include("wallet")
    .limit(100000)
    .find({ useMasterKey: true });
  const shops = await new Parse.Query("Shop").include("owner").find({ useMasterKey: true });
  const shopByOwner = new Map(shops.map((s) => [s.get("owner")?.id, s]));

  return wallets
    .map((wallet) => {
      const owner = wallet.get("owner");
      const own = transactions.filter((t) => t.get("wallet")?.id === wallet.id);
      const lifetimeCredit = own.filter((t) => t.get("amount") > 0).reduce((s, t) => s + t.get("amount"), 0);
      const lifetimeWithdrawn = Math.abs(
        own.filter((t) => t.get("amount") < 0).reduce((s, t) => s + t.get("amount"), 0),
      );
      return {
        userId: owner?.id,
        username: owner?.get("username"),
        shopName: shopByOwner.get(owner?.id)?.get("name") ?? null,
        balance: wallet.get("balance") ?? 0,
        lifetimeCredit,
        lifetimeWithdrawn,
      };
    })
    .sort((a, b) => b.balance - a.balance);
});

/** params: { from: ISO date, to: ISO date } */
Parse.Cloud.define("adminShopRevenue", async (request) => {
  await requireAdmin(request);
  const { from, to } = request.params;
  const { commissionPercent } = await loadSettings();

  const orders = await new Parse.Query("Order")
    .equalTo("status", "delivered")
    .greaterThanOrEqualTo("createdAt", new Date(from))
    .lessThanOrEqualTo("createdAt", new Date(to))
    .include("shop")
    .limit(100000)
    .find({ useMasterKey: true });

  const byShop = new Map();
  for (const order of orders) {
    const shop = order.get("shop");
    if (!shop) continue;
    const entry = byShop.get(shop.id) ?? { shopId: shop.id, shopName: shop.get("name"), ordersCount: 0, gmv: 0 };
    entry.ordersCount += 1;
    entry.gmv += order.get("total") ?? 0;
    byShop.set(shop.id, entry);
  }

  return [...byShop.values()]
    .map((entry) => {
      const commission = Math.floor((entry.gmv * commissionPercent) / 100);
      return { ...entry, commission, payout: entry.gmv - commission };
    })
    .sort((a, b) => b.gmv - a.gmv);
});

/** params: { from: ISO date, to: ISO date } */
Parse.Cloud.define("adminRevenueReport", async (request) => {
  await requireAdmin(request);
  const { from, to } = request.params;
  const { commissionPercent } = await loadSettings();

  const orders = await new Parse.Query("Order")
    .equalTo("status", "delivered")
    .greaterThanOrEqualTo("createdAt", new Date(from))
    .lessThanOrEqualTo("createdAt", new Date(to))
    .limit(100000)
    .find({ useMasterKey: true });

  const byDay = new Map();
  for (const order of orders) {
    const day = order.get("createdAt").toISOString().slice(0, 10);
    const entry = byDay.get(day) ?? { day, ordersCount: 0, gmv: 0 };
    entry.ordersCount += 1;
    entry.gmv += order.get("total") ?? 0;
    byDay.set(day, entry);
  }

  return [...byDay.values()]
    .map((entry) => ({ ...entry, commission: Math.floor((entry.gmv * commissionPercent) / 100) }))
    .sort((a, b) => a.day.localeCompare(b.day));
});

async function loadSettings() {
  const settings = await new Parse.Query("PlatformSettings").first({ useMasterKey: true });
  return {
    commissionPercent: settings?.get("commissionPercent") ?? 5,
    minWithdrawal: settings?.get("minWithdrawal") ?? 5000,
  };
}

/**
 * params: { commissionPercent, minWithdrawal, supportPhone?, supportEmail?,
 *           announcement?, announcementActive? }
 */
Parse.Cloud.define("adminUpdateSettings", async (request) => {
  await requireAdmin(request);
  const { commissionPercent, minWithdrawal, supportPhone, supportEmail, announcement, announcementActive } =
    request.params;

  let settings = await new Parse.Query("PlatformSettings").first({ useMasterKey: true });
  if (!settings) settings = new Parse.Object("PlatformSettings");

  settings.set("commissionPercent", commissionPercent);
  settings.set("minWithdrawal", minWithdrawal);
  settings.set("supportPhone", supportPhone ?? null);
  settings.set("supportEmail", supportEmail ?? null);
  settings.set("announcement", announcement ?? null);
  settings.set("announcementActive", announcementActive ?? false);
  await settings.save(null, { useMasterKey: true });

  return settings;
});

/** params: { productId, variantId?, delta, reason } */
Parse.Cloud.define("adminAdjustStock", async (request) => {
  await requireAdmin(request);
  const { productId, variantId, delta, reason } = request.params;
  if (!delta) throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Ajustement nul");
  if (!reason || !reason.trim()) throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Motif requis");

  const className = variantId ? "ProductVariant" : "Product";
  const targetId = variantId ?? productId;
  const target = await new Parse.Query(className).get(targetId, { useMasterKey: true }).catch(() => null);
  if (!target) throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Produit ou variante introuvable");

  // greatest(0, stock + delta) : un ajustement négatif ne fait jamais passer
  // le stock sous zéro, contrairement à une commande qui doit échouer dans ce cas.
  const newStock = Math.max(0, (target.get("stock") ?? 0) + delta);
  target.set("stock", newStock);
  await target.save(null, { useMasterKey: true });

  const movement = new Parse.Object("StockMovement");
  movement.set("product", new Parse.Object("Product").set("objectId", productId));
  if (variantId) movement.set("variant", target);
  movement.set("delta", delta);
  movement.set("reason", reason);
  movement.set("createdBy", request.user);
  await movement.save(null, { useMasterKey: true });

  return { stock: newStock };
});

/** params: { userId, fullName?, username, phone?, whatsapp?, city? } */
Parse.Cloud.define("adminUpdateProfile", async (request) => {
  await requireAdmin(request);
  const { userId, fullName, username, phone, whatsapp, city } = request.params;
  if (!username || !username.trim()) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Le pseudo est obligatoire");
  }

  const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
  user.set("fullName", fullName?.trim() || null);
  user.set("username", username.trim());
  user.set("phone", phone?.trim() || null);
  user.set("whatsapp", whatsapp?.trim() || null);
  user.set("city", city?.trim() || null);
  await user.save(null, { useMasterKey: true });

  return { ok: true };
});

/** params: { userId } — appelée par la route serveur après réinitialisation. */
Parse.Cloud.define("adminRequirePasswordChange", async (request) => {
  await requireAdmin(request);
  const user = await new Parse.Query(Parse.User).get(request.params.userId, { useMasterKey: true });
  user.set("mustChangePassword", true);
  await user.save(null, { useMasterKey: true });
  return { ok: true };
});

/** params: aucun — appelée par l'utilisateur connecté après son changement de mot de passe. */
Parse.Cloud.define("clearPasswordChangeFlag", async (request) => {
  const user = request.user;
  if (!user) throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Non connecté");
  user.set("mustChangePassword", false);
  await user.save(null, { useMasterKey: true });
  return { ok: true };
});

/** params: { shopId } */
Parse.Cloud.define("shopStats", async (request) => {
  const { shopId } = request.params;
  const shop = new Parse.Object("Shop");
  shop.id = shopId;

  const [delivered, pending, activeProducts, reviews, followers] = await Promise.all([
    new Parse.Query("Order").equalTo("shop", shop).equalTo("status", "delivered").find({ useMasterKey: true }),
    new Parse.Query("Order")
      .equalTo("shop", shop)
      .containedIn("status", ["pending", "confirmed", "preparing", "shipped"])
      .count({ useMasterKey: true }),
    new Parse.Query("Product").equalTo("shop", shop).equalTo("status", "active").count({ useMasterKey: true }),
    new Parse.Query("Review").equalTo("shop", shop).find({ useMasterKey: true }),
    new Parse.Query("Follow").equalTo("shop", shop).count({ useMasterKey: true }),
  ]);

  const totalSales = delivered.reduce((sum, o) => sum + (o.get("total") ?? 0), 0);
  const averageRating = reviews.length
    ? Math.round((reviews.reduce((sum, r) => sum + r.get("rating"), 0) / reviews.length) * 10) / 10
    : 0;

  return {
    totalSales,
    deliveredOrders: delivered.length,
    pendingOrders: pending,
    activeProducts,
    averageRating,
    ratingCount: reviews.length,
    followersCount: followers,
  };
});
