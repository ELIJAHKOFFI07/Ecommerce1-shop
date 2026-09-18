import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rateLimit";
import { adjustStock } from "@/lib/stock";
import { createOrder, transitionOrder } from "@/lib/orders";
import { hashPassword } from "@/lib/password";

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
const ADDR = { fullName: "Test", phone: "+2250700000000", city: "Abidjan", details: "Cocody, villa test" };

async function mkUser(role: "SUPER_ADMIN" | "CLIENT" = "CLIENT") {
  const u = await db.user.create({
    data: { name: `Test ${ids.users.length}`, email: `test-${suffix}-${ids.users.length}@example.test`, role, passwordHash: await hashPassword("Abidjan2024plateau") },
  });
  ids.users.push(u.id);
  return u;
}

async function mkProduct(stock = 100, admin?: string) {
  const p = await db.product.create({ data: { sku: `T-${suffix}-${ids.products.length}`, title: "Produit test", slug: `t-${suffix}-${ids.products.length}`, price: 5000 } });
  ids.products.push(p.id);
  if (stock > 0) await adjustStock({ productId: p.id, quantity: stock, reason: "RECEPTION", userId: admin ?? (await mkUser("SUPER_ADMIN")).id });
  return p;
}

describe.skipIf(!dbUp)("Intégration sécurité (base réelle)", () => {
  beforeAll(async () => {
    await db.settings.upsert({ where: { id: 1 }, create: { id: 1, shippingFee: 1500 }, update: { shippingFee: 1500, freeShippingThreshold: null } });
  });

  afterAll(async () => {
    await db.orderItem.deleteMany({ where: { order: { userId: { in: ids.users } } } });
    await db.order.deleteMany({ where: { userId: { in: ids.users } } });
    await db.stockMovement.deleteMany({ where: { productId: { in: ids.products } } });
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
    expect(results.filter((r) => r.status === "fulfilled").length).toBe(5);
  });

  it("commande : le prix et les frais de port viennent du serveur, pas du client", async () => {
    const u = await mkUser();
    const p = await mkProduct();
    const o = await createOrder({ userId: u.id, items: [{ productId: p.id, quantity: 2 }], paymentMethod: "CASH_ON_DELIVERY", address: ADDR });
    expect(o.subTotal.toNumber()).toBe(10_000);
    expect(o.shippingFee.toNumber()).toBe(1500);
    expect(o.total.toNumber()).toBe(11_500);
    expect(o.orderNumber).toMatch(/^DS-\d{8}-\d{4}$/);
  });

  it("commande : refusée si le stock est insuffisant", async () => {
    const u = await mkUser();
    const p = await mkProduct(1);
    await expect(createOrder({ userId: u.id, items: [{ productId: p.id, quantity: 2 }], paymentMethod: "CASH_ON_DELIVERY", address: ADDR })).rejects.toMatchObject({ status: 400 });
  });

  it("commande : deux confirmations simultanées ne décrémentent le stock qu'une fois", async () => {
    const admin = await mkUser("SUPER_ADMIN");
    const u = await mkUser();
    const p = await mkProduct(10, admin.id);
    const o = await createOrder({ userId: u.id, items: [{ productId: p.id, quantity: 4 }], paymentMethod: "CASH_ON_DELIVERY", address: ADDR });
    const results = await Promise.allSettled([
      transitionOrder({ orderId: o.id, status: "CONFIRMED", actorId: admin.id }),
      transitionOrder({ orderId: o.id, status: "CONFIRMED", actorId: admin.id }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled").length).toBe(1);
    const after = await db.product.findUniqueOrThrow({ where: { id: p.id } });
    expect(after.stock).toBe(6);
  });

  it("commande : l'annulation d'une commande confirmée restitue le stock, et une commande livrée est figée", async () => {
    const admin = await mkUser("SUPER_ADMIN");
    const u = await mkUser();
    const p = await mkProduct(10, admin.id);
    const o = await createOrder({ userId: u.id, items: [{ productId: p.id, quantity: 3 }], paymentMethod: "CASH_ON_DELIVERY", address: ADDR });
    await transitionOrder({ orderId: o.id, status: "CONFIRMED", actorId: admin.id });
    await transitionOrder({ orderId: o.id, status: "CANCELLED", cancelReason: "test", actorId: admin.id });
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(10);

    const o2 = await createOrder({ userId: u.id, items: [{ productId: p.id, quantity: 1 }], paymentMethod: "CASH_ON_DELIVERY", address: ADDR });
    await transitionOrder({ orderId: o2.id, status: "CONFIRMED", actorId: admin.id });
    await transitionOrder({ orderId: o2.id, status: "SHIPPED", actorId: admin.id });
    await expect(transitionOrder({ orderId: o2.id, status: "CANCELLED", cancelReason: "x", actorId: u.id, byCustomer: true })).rejects.toMatchObject({ status: 400 });
    const d = await transitionOrder({ orderId: o2.id, status: "DELIVERED", actorId: admin.id });
    expect(d.paymentStatus).toBe("PAID");
    await expect(transitionOrder({ orderId: o2.id, status: "CANCELLED", cancelReason: "x", actorId: admin.id })).rejects.toMatchObject({ status: 400 });
  });
});
