import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, TX } from "../src/lib/db";
import { move, adjustUserStock } from "../src/lib/stock";
import { adjustGeneralBalance, creditWallet } from "../src/lib/wallet";
import { createOrder, transitionOrder } from "../src/lib/orders";
import { createDelivery, transitionDelivery } from "../src/lib/deliveries";

/// Jeu de données de TEST : un compte par rôle, un bureau, une formation,
/// du stock, des commandes à chaque état, des retraits, des soldes.
///
/// Tous les comptes ont le même mot de passe : SEED_TEST_PASSWORD, ou
/// « Superlife2026test » par défaut. À NE PAS lancer en production.
/// Idempotent : relancer ne duplique rien (clé : e-mail / SKU).
const PASSWORD = process.env.SEED_TEST_PASSWORD ?? "Superlife2026test";

const USERS = [
  { key: "admin", email: "admin@test.superlife", name: "Aïcha Admin", role: "ADMIN", phone: "+2250700000001", memberNumber: "SL-100001" },
  { key: "stock", email: "stock@test.superlife", name: "Sékou Stock", role: "STOCK_MANAGER", phone: "+2250700000002", memberNumber: "SL-100002" },
  { key: "support", email: "support@test.superlife", name: "Salimata Support", role: "SUPPORT", phone: "+2250700000003", memberNumber: "SL-100003" },
  { key: "chef", email: "chef@test.superlife", name: "Kouamé Chef", role: "CLIENT", status: "CHEF_EQUIPE", phone: "+2250700000010", memberNumber: "SL-200001", city: "Abidjan" },
  { key: "indep", email: "membre1@test.superlife", name: "Awa Indépendante", role: "CLIENT", status: "INDEPENDANT", phone: "+2250700000011", memberNumber: "SL-200002", city: "Yopougon", sponsor: "chef" },
  { key: "membre", email: "membre2@test.superlife", name: "Yao Membre", role: "CLIENT", status: "MEMBRE", phone: "+2250700000012", memberNumber: "SL-200003", city: "Bouaké", sponsor: "indep" },
  { key: "bloque", email: "bloque@test.superlife", name: "Compte Bloqué", role: "CLIENT", status: "MEMBRE", phone: "+2250700000013", memberNumber: "SL-200004", blocked: true },
] as const;

/// Permissions des comptes staff (le SUPER_ADMIN n'en a pas besoin).
const PERMS: Record<string, { slug: string; edit: boolean }[]> = {
  admin: ["products", "categories", "stock", "orders", "deliveries", "wallet", "users", "offices", "formations", "conversions", "settings"].map((slug) => ({ slug, edit: true })),
  stock: [{ slug: "products", edit: true }, { slug: "stock", edit: true }, { slug: "deliveries", edit: true }, { slug: "orders", edit: false }],
  support: [{ slug: "orders", edit: false }, { slug: "deliveries", edit: false }, { slug: "users", edit: false }, { slug: "wallet", edit: false }],
};

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
      data: {
        email: u.email, name: u.name, role: u.role, status: "status" in u ? u.status : "MEMBRE", phone: u.phone, memberNumber: u.memberNumber,
        city: "city" in u ? u.city : null, blocked: "blocked" in u ? u.blocked : false, passwordHash: hash, passwordChangedAt: new Date(),
        sponsorId: "sponsor" in u && u.sponsor ? ids[u.sponsor] : null, wallet: { create: {} },
      },
      select: { id: true },
    });
    ids[u.key] = created.id;
    console.log(`compte ${u.email.padEnd(28)} ${u.role}`);
  }

  // 2. Permissions
  const modules = await db.module.findMany({ select: { id: true, slug: true } });
  for (const [key, perms] of Object.entries(PERMS)) {
    await db.userPermission.deleteMany({ where: { userId: ids[key] } });
    await db.userPermission.createMany({ data: perms.map((p) => ({ userId: ids[key]!, moduleId: modules.find((m) => m.slug === p.slug)!.id, canView: true, canEdit: p.edit })) });
  }

  // 3. Bureau + formations
  const office = await db.office.upsert({
    where: { name: "Bureau de Cocody" },
    create: { name: "Bureau de Cocody", managerId: ids.chef!, city: "Abidjan", commune: "Cocody", neighborhood: "Riviera 2" },
    update: {},
  });
  await db.user.updateMany({ where: { id: { in: [ids.chef!, ids.indep!, ids.membre!] } }, data: { officeId: office.id } });
  if ((await db.formation.count({ where: { officeId: office.id } })) === 0) {
    await db.formation.createMany({
      data: [
        { officeId: office.id, type: "TRAINING", title: "Formation produits — débutants", dayOfWeek: 3, timeSlot: "18h – 20h", location: "Bureau de Cocody" },
        { officeId: office.id, type: "CONFERENCE", title: "Conférence de lancement", date: new Date(Date.now() + 14 * 86400000), timeSlot: "10h", location: "Hôtel Ivoire, Abidjan" },
      ],
    });
  }

  // 4. Produits en vente + stock
  const products = await db.product.findMany({ select: { id: true, sku: true, price: true }, orderBy: { sku: "asc" } });
  if (products.length === 0) throw new Error("Lancez d'abord `npx tsx prisma/seed-products.ts`.");
  const PRICES: Record<string, number> = { STC30: 45000, "SCC-PLUS": 38000, SIC: 32000, SNC: 32000, SPRAY: 15000, SUPERCELL: 60000, DRC: 12000 };
  for (const p of products) {
    if (Number(p.price) <= 1) await db.product.update({ where: { id: p.id }, data: { price: PRICES[p.sku] ?? 20000, active: true } });
  }
  const already = await db.stockMovement.count({ where: { note: "Seed test" } });
  if (already === 0) {
    // Une transaction par produit : la base est distante, une seule
    // transaction pour tout dépasserait le délai.
    for (const p of products) {
      await db.$transaction(async (tx) => {
        await move(tx, { productId: p.id, location: "VIRTUEL", quantity: 100, reason: "RECEPTION", note: "Seed test", userId: superAdmin.id });
        await move(tx, { productId: p.id, location: "DISPONIBLE", quantity: 60, reason: "RECEPTION", note: "Seed test", userId: superAdmin.id });
        await move(tx, { productId: p.id, location: "BUREAU", quantity: 40, reason: "RECEPTION", note: "Seed test", userId: superAdmin.id });
        await move(tx, { productId: p.id, location: "ENTREPOT", quantity: 20, reason: "RECEPTION", note: "Seed test", userId: superAdmin.id });
      }, TX);
    }
    console.log("stock initial : 100 virtuel / 60 disponible / 40 bureau / 20 entrepôt par produit");
  }

  // 5. Caisse + soldes
  const s = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
  if (Number(s.generalBalance) < 500_000) {
    await adjustGeneralBalance({ type: "CREDIT", amount: 2_000_000, adminId: superAdmin.id, description: "Apport initial (seed test)" });
  }
  for (const [key, amount] of [["chef", 150_000], ["indep", 80_000], ["membre", 25_000]] as const) {
    const w = await db.wallet.findUnique({ where: { userId: ids[key] }, select: { balance: true } });
    if (Number(w?.balance ?? 0) === 0) await creditWallet({ userId: ids[key]!, amount, adminId: superAdmin.id, description: "Crédit initial (seed test)", paymentMethod: "CASH" });
  }

  // 6. Commandes à chaque état + retraits
  const [p1, p2, p3] = products;
  if ((await db.order.count({ where: { claimReference: { startsWith: "TEST-" } } })) === 0) {
    const o1 = await createOrder({ userId: ids.chef!, items: [{ productId: p1!.id, quantity: 3 }, { productId: p2!.id, quantity: 2 }], claimReference: "TEST-VALIDEE-001", salesNo: "MYTEDIVOIRCSB260900001" });
    await transitionOrder({ orderId: o1.id, status: "VALIDATED", adminId: superAdmin.id });
    const o2 = await createOrder({ userId: ids.indep!, items: [{ productId: p3!.id, quantity: 5 }], claimReference: "TEST-VALIDEE-002" });
    await transitionOrder({ orderId: o2.id, status: "VALIDATED", adminId: superAdmin.id });
    await createOrder({ userId: ids.membre!, items: [{ productId: p1!.id, quantity: 1 }], claimReference: "TEST-ATTENTE-003", note: "Reçu envoyé depuis le seed" });
    const o4 = await createOrder({ userId: ids.membre!, items: [{ productId: p2!.id, quantity: 2 }], claimReference: "TEST-REJETEE-004" });
    await transitionOrder({ orderId: o4.id, status: "REJECTED", rejectionReason: "Référence illisible sur la photo (seed test)", adminId: superAdmin.id });
    console.log("commandes : 2 validées, 1 en attente, 1 rejetée");

    // Retrait remis (avec TVA payée depuis le solde) et retrait en attente
    const d1 = await createDelivery({ userId: ids.chef!, items: [{ productId: p1!.id, quantity: 1 }], recipientName: "Kouamé Chef", recipientPhone: "+2250700000010" });
    await transitionDelivery({ deliveryId: d1.id, status: "APPROVED", adminId: superAdmin.id });
    await db.delivery.update({ where: { id: d1.id }, data: { tva: 9000 } });
    const { payDeliveryTva } = await import("../src/lib/deliveries");
    await payDeliveryTva({ deliveryId: d1.id, paymentMethod: "WALLET", adminId: superAdmin.id });
    await transitionDelivery({ deliveryId: d1.id, status: "DELIVERED", adminId: superAdmin.id });
    await createDelivery({ userId: ids.indep!, items: [{ productId: p3!.id, quantity: 2 }] });
    console.log("retraits : 1 remis (TVA payée depuis le solde), 1 en attente");

    // Un stock personnel supplémentaire pour la conversion
    await db.$transaction((tx) => adjustUserStock(tx, ids.membre!, p3!.id, 2), TX);
  }

  console.log("\nComptes de test (mot de passe commun : " + PASSWORD + ")");
  for (const u of USERS) console.log(`  ${u.role.padEnd(14)} ${u.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
