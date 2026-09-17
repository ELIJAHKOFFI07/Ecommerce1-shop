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
  { slug: "categories", name: "Catégories", description: "Arborescence du catalogue" },
  { slug: "stock", name: "Stock", description: "Niveaux, réapprovisionnement, transferts, ajustements" },
  { slug: "orders", name: "Commandes", description: "Validation et suivi des reçus" },
  { slug: "deliveries", name: "Retraits", description: "Approbation et remise des produits" },
  { slug: "wallet", name: "Portefeuilles", description: "Crédits et historique des membres" },
  { slug: "users", name: "Membres", description: "Comptes, rôles, blocage" },
  { slug: "offices", name: "Bureaux", description: "Bureaux régionaux et responsables" },
  { slug: "formations", name: "Formations", description: "Formations et conférences" },
  { slug: "conversions", name: "Conversions", description: "Échanges de produits" },
  { slug: "settings", name: "Paramètres", description: "Réglages généraux" },
];

async function main() {
  for (const m of MODULES) {
    await db.module.upsert({ where: { slug: m.slug }, create: m, update: { name: m.name, description: m.description } });
  }
  await db.settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });

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
  const user = await db.user.create({
    data: {
      memberNumber: "SL-000001",
      name: process.env.SEED_ADMIN_NAME ?? "Super administrateur",
      email,
      role: "SUPER_ADMIN",
      passwordHash,
      passwordChangedAt: process.env.SEED_ADMIN_PASSWORD ? new Date() : null,
      wallet: { create: {} },
    },
    select: { memberNumber: true },
  });
  console.log(`Super-admin créé : ${email} (${user.memberNumber})`);
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
