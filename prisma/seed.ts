import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { randomBytes } from "node:crypto";

/// Amorçage : modules de permission, paramètres, et le premier SUPER_ADMIN.
///
/// Le mot de passe du super-admin n'est JAMAIS écrit ici. Il vient de
/// `SEED_ADMIN_PASSWORD` ; s'il est absent, un mot de passe aléatoire est
/// généré et affiché UNE fois en console — à changer à la première
/// connexion. Relancer le seed ne recrée pas l'admin s'il existe.
const MODULES = [
  { slug: "products", name: "Produits", description: "Catalogue et fiches produit" },
  { slug: "categories", name: "Catégories", description: "Rayons de la boutique" },
  { slug: "stock", name: "Stock", description: "Niveaux, réceptions, ajustements" },
  { slug: "orders", name: "Commandes", description: "Confirmation, expédition, livraison, paiements" },
  { slug: "users", name: "Utilisateurs", description: "Comptes, rôles, blocage" },
  { slug: "accounting", name: "Comptabilité", description: "Ventes, exports" },
  { slug: "settings", name: "Paramètres", description: "Livraison, Mobile Money, coordonnées" },
];

async function main() {
  for (const m of MODULES) {
    await db.module.upsert({ where: { slug: m.slug }, create: m, update: { name: m.name, description: m.description } });
  }
  await db.settings.upsert({ where: { id: 1 }, create: { id: 1, siteName: "DreamShop", shippingFee: 1500, freeShippingThreshold: 50000 }, update: {} });

  const email = (process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!email) {
    console.log("SEED_ADMIN_EMAIL absent : aucun super-admin créé (modules et paramètres OK).");
    return;
  }
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    console.log(`Super-admin ${email} déjà présent — rien à faire.`);
    return;
  }
  const password = process.env.SEED_ADMIN_PASSWORD ?? randomBytes(12).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.create({
    data: { name: process.env.SEED_ADMIN_NAME ?? "Super administrateur", email, role: "SUPER_ADMIN", passwordHash, passwordChangedAt: process.env.SEED_ADMIN_PASSWORD ? new Date() : null },
  });
  console.log(`Super-admin créé : ${email}`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(`Mot de passe temporaire (affiché une seule fois) : ${password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
