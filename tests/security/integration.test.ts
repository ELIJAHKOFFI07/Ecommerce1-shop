import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rateLimit";
import { creditWallet, transferWallet, adjustGeneralBalance, getBalance } from "@/lib/wallet";
import { createOrder, transitionOrder } from "@/lib/orders";
import { hashPassword } from "@/lib/password";
import { ApiError } from "@/lib/apiError";

/// Tests contre la vraie base (tunnel SSH). Se sautent si injoignable.
let dbUp = false;
try {
  await db.$queryRaw`SELECT 1`;
  dbUp = true;
} catch {
  dbUp = false;
}

const suffix = Date.now().toString(36);
const ids: { users: string[]; products: string[] } = { users: [], products: [] };

async function mkUser(role: "SUPER_ADMIN" | "CLIENT" = "CLIENT") {
  const u = await db.user.create({
    data: {
      memberNumber: `T-${suffix}-${ids.users.length}`,
      name: `Test ${ids.users.length}`,
      email: `test-${suffix}-${ids.users.length}@example.test`,
      role,
      passwordHash: await hashPassword("Abidjan2024plateau"),
      wallet: { create: {} },
    },
  });
  ids.users.push(u.id);
  return u;
}

async function mkProduct(stockVirtuel = 100) {
  const p = await db.product.create({
    data: { sku: `T-${suffix}-${ids.products.length}`, title: "Produit test", slug: `t-${suffix}-${ids.products.length}`, price: 5000, tva: 20, stockVirtuel, stockDisponible: stockVirtuel },
  });
  ids.products.push(p.id);
  return p;
}

describe.skipIf(!dbUp)("Intégration sécurité (base réelle)", () => {
  beforeAll(async () => {
    await db.settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
  });

  afterAll(async () => {
    await db.walletTransaction.deleteMany({ where: { OR: [{ userId: { in: ids.users } }, { adminId: { in: ids.users } }] } });
    await db.orderItem.deleteMany({ where: { order: { userId: { in: ids.users } } } });
    await db.order.deleteMany({ where: { userId: { in: ids.users } } });
    await db.stockMovement.deleteMany({ where: { productId: { in: ids.products } } });
    await db.userStock.deleteMany({ where: { userId: { in: ids.users } } });
    await db.auditLog.deleteMany({ where: { userId: { in: ids.users } } });
    await db.product.deleteMany({ where: { id: { in: ids.products } } });
    await db.user.deleteMany({ where: { id: { in: ids.users } } });
    await db.rateLimit.deleteMany({ where: { key: { contains: suffix } } });
    await db.$disconnect();
  });

  it("limitation de débit : la 6e tentative de connexion est refusée", async () => {
    const key = `ip-${suffix}`;
    for (let i = 0; i < 5; i++) await consumeRateLimit("login", key);
    await expect(consumeRateLimit("login", key)).rejects.toMatchObject({ status: 429 });
  });

  it("limitation de débit : atomique sous concurrence (20 requêtes simultanées → 5 passent)", async () => {
    const key = `burst-${suffix}`;
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => consumeRateLimit("login", key)));
    const passed = results.filter((r) => r.status === "fulfilled").length;
    expect(passed).toBe(5);
  });

  it("portefeuille : 10 débits concurrents ne dépassent jamais le solde", async () => {
    const admin = await mkUser("SUPER_ADMIN");
    const a = await mkUser();
    const b = await mkUser();
    await adjustGeneralBalance({ type: "CREDIT", amount: 100_000, adminId: admin.id, description: "test" });
    await creditWallet({ userId: a.id, amount: 10_000, adminId: admin.id });
    // 10 transferts de 3 000 depuis 10 000 : seuls 3 peuvent réussir.
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => transferWallet({ senderId: a.id, receiverId: b.id, amount: 3000 })));
    const okCount = results.filter((r) => r.status === "fulfilled").length;
    expect(okCount).toBe(3);
    expect((await getBalance(a.id)).toNumber()).toBe(1000);
    expect((await getBalance(b.id)).toNumber()).toBe(9000);
  });

  it("portefeuille : le crédit est refusé si le solde général est insuffisant", async () => {
    const admin = await mkUser("SUPER_ADMIN");
    const u = await mkUser();
    const s = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
    await expect(creditWallet({ userId: u.id, amount: Number(s.generalBalance) + 1, adminId: admin.id })).rejects.toBeInstanceOf(ApiError);
  });

  it("commande : le prix vient du catalogue, pas du client, et la référence de reçu est unique", async () => {
    const u = await mkUser();
    const p = await mkProduct();
    const o = await createOrder({ userId: u.id, items: [{ productId: p.id, quantity: 2 }], claimReference: `REC-${suffix}` });
    expect(o.subTotal.toNumber()).toBe(10_000);
    expect(o.taxTotal.toNumber()).toBe(2000);
    expect(o.total.toNumber()).toBe(12_000);
    await expect(createOrder({ userId: u.id, items: [{ productId: p.id, quantity: 1 }], claimReference: `REC-${suffix}` })).rejects.toMatchObject({ status: 409 });
  });

  it("commande : deux validations simultanées ne décrémentent le stock qu'une fois", async () => {
    const admin = await mkUser("SUPER_ADMIN");
    const u = await mkUser();
    const p = await mkProduct(10);
    const o = await createOrder({ userId: u.id, items: [{ productId: p.id, quantity: 4 }], claimReference: `REC2-${suffix}` });
    const results = await Promise.allSettled([
      transitionOrder({ orderId: o.id, status: "VALIDATED", adminId: admin.id }),
      transitionOrder({ orderId: o.id, status: "VALIDATED", adminId: admin.id }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled").length).toBe(1);
    const after = await db.product.findUniqueOrThrow({ where: { id: p.id } });
    expect(after.stockVirtuel).toBe(6);
    const us = await db.userStock.findUniqueOrThrow({ where: { userId_productId: { userId: u.id, productId: p.id } } });
    expect(us.quantity).toBe(4);
  });

  it("commande : une commande validée ne peut plus être rejetée", async () => {
    const admin = await mkUser("SUPER_ADMIN");
    const u = await mkUser();
    const p = await mkProduct(10);
    const o = await createOrder({ userId: u.id, items: [{ productId: p.id, quantity: 1 }], claimReference: `REC3-${suffix}` });
    await transitionOrder({ orderId: o.id, status: "VALIDATED", adminId: admin.id });
    await expect(transitionOrder({ orderId: o.id, status: "REJECTED", rejectionReason: "x", adminId: admin.id })).rejects.toMatchObject({ status: 400 });
  });
});
