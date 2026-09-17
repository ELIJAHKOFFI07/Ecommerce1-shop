import "dotenv/config";
import { db } from "../src/lib/db";

/// Les trois catégories du catalogue : Compléments, Skincare, Café.
/// Réaffecte les produits de base, puis supprime les catégories devenues
/// vides. Idempotent.
const CATS = [
  { slug: "complements", name: "Compléments" },
  { slug: "skincare", name: "Skincare" },
  { slug: "cafe", name: "Café" },
];
const BY_SKU: Record<string, string> = { STC30: "complements", "SCC-PLUS": "complements", SIC: "complements", SNC: "complements", SUPERCELL: "complements", SPRAY: "skincare", DRC: "cafe" };

async function main() {
  const ids: Record<string, string> = {};
  for (const c of CATS) {
    const r = await db.category.upsert({ where: { slug: c.slug }, create: c, update: { name: c.name }, select: { id: true } });
    ids[c.slug] = r.id;
  }
  for (const [sku, slug] of Object.entries(BY_SKU)) {
    const p = await db.product.findUnique({ where: { sku }, select: { id: true } });
    if (!p) continue;
    await db.product.update({ where: { id: p.id }, data: { categories: { set: [{ id: ids[slug]! }] } } });
  }
  const gone = await db.category.deleteMany({ where: { slug: { notIn: CATS.map((c) => c.slug) }, products: { none: {} } } });
  console.log(`catégories : ${CATS.map((c) => c.name).join(", ")} — ${gone.count} ancienne(s) vide(s) supprimée(s)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
