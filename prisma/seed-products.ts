import "dotenv/config";
import { readFileSync } from "node:fs";
import { db } from "../src/lib/db";

/// Produits de base SuperLife. Prix inconnus à la création : ils sont
/// enregistrés HORS VENTE avec un prix provisoire de 1 F ; l'admin saisit
/// le prix réel et coche « En vente ». Relancer le script ne modifie pas
/// un produit déjà présent (clé : SKU).
const images: Record<string, string> = JSON.parse(readFileSync("prisma/products-images.json", "utf8"));

const PRODUCTS = [
  { sku: "STC30", image: "STC30", title: "STC30", description: "Complément SuperLife à base de cellules souches végétales (Superlife Total Care 30). Boîte de sachets à diluer dans l’eau." },
  { sku: "SCC-PLUS", image: "SCC+", title: "SCC+", description: "Superlife Colon Care Plus — complément à base de fibres et de plantes pour le confort digestif. Boîte de sachets." },
  { sku: "SIC", image: "SIC", title: "SIC", description: "Superlife Immune Care — complément à base d’extraits végétaux. Boîte de sachets." },
  { sku: "SNC", image: "SNC", title: "SNC", description: "Superlife Neuron Care — complément à base d’extraits végétaux. Boîte de sachets." },
  { sku: "SPRAY", image: "Spray", title: "Spray", description: "Spray SuperLife. Flacon prêt à l’emploi." },
  { sku: "SUPERCELL", image: "SuperCell", title: "SuperCell", description: "SuperCell — complément SuperLife à base de cellules souches végétales. Boîte de sachets." },
  { sku: "DRC", image: "Double root cofee", title: "Double Root Coffee", description: "Café SuperLife enrichi en extraits de racines (Double Root Coffee). Boîte de sachets individuels." },
];

async function main() {
  const cat = await db.category.upsert({ where: { slug: "complements" }, create: { name: "Compléments", slug: "complements" }, update: {} });
  const coffee = await db.category.upsert({ where: { slug: "boissons" }, create: { name: "Boissons", slug: "boissons" }, update: {} });
  for (const p of PRODUCTS) {
    const url = images[p.image];
    if (!url) throw new Error(`Image manquante pour ${p.image}`);
    const exists = await db.product.findUnique({ where: { sku: p.sku }, select: { id: true } });
    if (exists) {
      console.log(`${p.sku.padEnd(10)} déjà présent`);
      continue;
    }
    await db.product.create({
      data: {
        sku: p.sku,
        title: p.title,
        slug: p.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: p.description,
        price: 1,
        tva: 20,
        images: [url],
        active: false,
        categories: { connect: [{ id: p.sku === "DRC" ? coffee.id : cat.id }] },
      },
    });
    console.log(`${p.sku.padEnd(10)} créé (hors vente, prix à saisir)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
