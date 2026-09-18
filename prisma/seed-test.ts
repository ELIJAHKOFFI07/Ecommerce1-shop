import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { adjustStock } from "../src/lib/stock";
import { createOrder, transitionOrder } from "../src/lib/orders";
import images from "./products-images.json";

/// Jeu de données de TEST : un compte par rôle, des clients, des
/// catégories, des produits avec photos, des commandes à chaque état.
///
/// Tous les comptes ont le même mot de passe : SEED_TEST_PASSWORD, ou
/// « Dreamshop2026test » par défaut. À NE PAS lancer en production.
/// Idempotent : relancer ne duplique rien (clé : e-mail / SKU / slug).
const PASSWORD = process.env.SEED_TEST_PASSWORD ?? "Dreamshop2026test";

const USERS = [
  { key: "admin", email: "admin@test.dreamshop", name: "Aïcha Admin", role: "ADMIN", phone: "+2250700000001" },
  { key: "stock", email: "stock@test.dreamshop", name: "Sékou Stock", role: "STOCK_MANAGER", phone: "+2250700000002" },
  { key: "support", email: "support@test.dreamshop", name: "Salimata Support", role: "SUPPORT", phone: "+2250700000003" },
  { key: "client1", email: "client1@test.dreamshop", name: "Kouamé Client", role: "CLIENT", phone: "+2250700000010" },
  { key: "client2", email: "client2@test.dreamshop", name: "Awa Cliente", role: "CLIENT", phone: "+2250700000011" },
  { key: "client3", email: "client3@test.dreamshop", name: "Yao Nouveau", role: "CLIENT", phone: "+2250700000012" },
  { key: "bloque", email: "bloque@test.dreamshop", name: "Compte Bloqué", role: "CLIENT", phone: "+2250700000013", blocked: true },
] as const;

/// Permissions des comptes staff (le SUPER_ADMIN n'en a pas besoin).
const PERMS: Record<string, { slug: string; edit: boolean }[]> = {
  admin: ["products", "categories", "stock", "orders", "users", "accounting", "settings"].map((slug) => ({ slug, edit: true })),
  stock: [{ slug: "products", edit: true }, { slug: "categories", edit: true }, { slug: "stock", edit: true }, { slug: "orders", edit: false }],
  support: [{ slug: "orders", edit: true }, { slug: "users", edit: false }],
};

const CATEGORIES = [
  { slug: "bien-etre", name: "Bien-être", position: 1 },
  { slug: "boissons", name: "Boissons", position: 2 },
  { slug: "beaute", name: "Beauté", position: 3 },
];

type Img = keyof typeof images;
const PRODUCTS: { sku: string; title: string; image: Img; price: number; compareAtPrice?: number; featured?: boolean; stock: number; category: string; description: string }[] = [
  { sku: "STC30", title: "STC30", image: "STC30", price: 45000, featured: true, stock: 40, category: "bien-etre", description: "Complément à base de cellules souches végétales. Boîte de sachets à diluer dans l’eau." },
  { sku: "SCC-PLUS", title: "SCC+", image: "SCC+", price: 38000, compareAtPrice: 42000, featured: true, stock: 25, category: "bien-etre", description: "Fibres et plantes pour le confort digestif. Boîte de sachets." },
  { sku: "SIC", title: "SIC", image: "SIC", price: 35000, stock: 18, category: "bien-etre", description: "Extraits végétaux pour soutenir les défenses naturelles. Boîte de sachets." },
  { sku: "SNC", title: "SNC", image: "SNC", price: 35000, stock: 3, category: "bien-etre", description: "Extraits végétaux pour la concentration. Boîte de sachets." },
  { sku: "SPRAY", title: "Spray", image: "Spray", price: 12000, stock: 60, category: "beaute", description: "Spray prêt à l’emploi." },
  { sku: "SUPERCELL", title: "SuperCell", image: "SuperCell", price: 52000, featured: true, stock: 12, category: "bien-etre", description: "Complément à base de cellules souches végétales. Boîte de sachets." },
  { sku: "DRC", title: "Double Root Coffee", image: "Double root cofee", price: 15000, compareAtPrice: 18000, stock: 0, category: "boissons", description: "Café enrichi en extraits de racines. Boîte de sachets individuels." },
];

async function main() {
  const superAdmin = await db.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { id: true } });
  if (!superAdmin) throw new Error("Lancez d'abord `npm run db:seed` (super-admin).");
  const hash = await bcrypt.hash(PASSWORD, 12);
  const ids: Record<string, string> = {};

  // 1. Comptes
  for (const u of USERS) {
    const existing = await db.user.findUnique({ where: { email: u.email }, select: { id: true } });
    if (existing) {
      ids[u.key] = existing.id;
      continue;
    }
    const created = await db.user.create({
      data: { email: u.email, name: u.name, role: u.role, phone: u.phone, blocked: "blocked" in u ? u.blocked : false, passwordHash: hash, passwordChangedAt: new Date() },
      select: { id: true },
    });
    ids[u.key] = created.id;
    console.log(`compte ${u.email.padEnd(28)} ${u.role}`);
  }

  // 2. Permissions
  const modules = await db.module.findMany({ select: { id: true, slug: true } });
  for (const [key, perms] of Object.entries(PERMS)) {
    for (const p of perms) {
      const mod = modules.find((m) => m.slug === p.slug);
      if (!mod) continue;
      await db.userPermission.upsert({
        where: { userId_moduleId: { userId: ids[key]!, moduleId: mod.id } },
        create: { userId: ids[key]!, moduleId: mod.id, canView: true, canEdit: p.edit },
        update: { canView: true, canEdit: p.edit },
      });
    }
  }

  // 3. Adresses des clients
  for (const [key, addr] of [
    ["client1", { label: "Domicile", fullName: "Kouamé Client", phone: "+2250700000010", city: "Abidjan", commune: "Cocody", details: "Riviera 2, rue des Jardins, villa 14", isDefault: true }],
    ["client2", { label: "Bureau", fullName: "Awa Cliente", phone: "+2250700000011", city: "Abidjan", commune: "Plateau", details: "Immeuble Alpha 2000, 5e étage", isDefault: true }],
  ] as const) {
    const has = await db.address.count({ where: { userId: ids[key]! } });
    if (!has) await db.address.create({ data: { userId: ids[key]!, ...addr } });
  }

  // 4. Catégories et produits
  const cats: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const cat = await db.category.upsert({ where: { slug: c.slug }, create: c, update: { name: c.name, position: c.position }, select: { id: true } });
    cats[c.slug] = cat.id;
  }
  const prodIds: Record<string, string> = {};
  for (const p of PRODUCTS) {
    const exists = await db.product.findUnique({ where: { sku: p.sku }, select: { id: true } });
    if (exists) {
      prodIds[p.sku] = exists.id;
      continue;
    }
    const created = await db.product.create({
      data: {
        sku: p.sku, title: p.title, slug: p.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-"), description: p.description, price: p.price, compareAtPrice: p.compareAtPrice ?? null,
        images: [images[p.image]], active: true, featured: p.featured ?? false, lowStockAlert: 5, categories: { connect: [{ id: cats[p.category]! }] },
      },
      select: { id: true },
    });
    prodIds[p.sku] = created.id;
    if (p.stock > 0) await adjustStock({ productId: created.id, quantity: p.stock, reason: "RECEPTION", note: "Stock initial (test)", userId: ids.stock! });
    console.log(`produit ${p.sku.padEnd(10)} ${p.price} F, stock ${p.stock}`);
  }

  // 5. Commandes à chaque état
  if ((await db.order.count()) === 0) {
    const addr1 = { fullName: "Kouamé Client", phone: "+2250700000010", city: "Abidjan", commune: "Cocody", details: "Riviera 2, rue des Jardins, villa 14" };
    const addr2 = { fullName: "Awa Cliente", phone: "+2250700000011", city: "Abidjan", commune: "Plateau", details: "Immeuble Alpha 2000, 5e étage" };
    const mk = (userId: string, address: typeof addr1, paymentMethod: "CASH_ON_DELIVERY" | "MOBILE_MONEY", items: { sku: string; quantity: number }[], note?: string) =>
      createOrder({ userId, address, paymentMethod, items: items.map((i) => ({ productId: prodIds[i.sku]!, quantity: i.quantity })), note });
    const go = (orderId: string, status: "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED", cancelReason?: string) => transitionOrder({ orderId, status, cancelReason, actorId: ids.admin! });

    const o1 = await mk(ids.client1!, addr1, "CASH_ON_DELIVERY", [{ sku: "STC30", quantity: 1 }, { sku: "SPRAY", quantity: 2 }], "Appeler avant de livrer.");
    const o2 = await mk(ids.client1!, addr1, "MOBILE_MONEY", [{ sku: "SCC-PLUS", quantity: 1 }]);
    const o3 = await mk(ids.client2!, addr2, "CASH_ON_DELIVERY", [{ sku: "SUPERCELL", quantity: 1 }, { sku: "SIC", quantity: 1 }]);
    await go(o3.id, "CONFIRMED");
    const o4 = await mk(ids.client2!, addr2, "MOBILE_MONEY", [{ sku: "STC30", quantity: 2 }]);
    await db.order.update({ where: { id: o4.id }, data: { paymentStatus: "PAID", paymentRef: "MM-TEST-0001" } });
    await go(o4.id, "CONFIRMED");
    await go(o4.id, "SHIPPED");
    const o5 = await mk(ids.client1!, addr1, "CASH_ON_DELIVERY", [{ sku: "SPRAY", quantity: 3 }]);
    await go(o5.id, "CONFIRMED");
    await go(o5.id, "SHIPPED");
    await go(o5.id, "DELIVERED");
    const o6 = await mk(ids.client2!, addr2, "CASH_ON_DELIVERY", [{ sku: "SNC", quantity: 1 }]);
    await go(o6.id, "CANCELLED", "Le client a changé d’avis.");
    console.log(`commandes : ${[o1, o2, o3, o4, o5, o6].map((o) => o.orderNumber).join(", ")}`);
  }

  console.log("");
  console.log("═".repeat(60));
  console.log("Comptes de test — mot de passe commun : " + PASSWORD);
  for (const u of USERS) console.log(`  ${u.role.padEnd(14)} ${u.email}${"blocked" in u && u.blocked ? "  (bloqué)" : ""}`);
  console.log("═".repeat(60));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
