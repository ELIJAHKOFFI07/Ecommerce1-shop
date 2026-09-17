import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "./db";

/// Catalogue public, en cache.
///
/// La base est sur un VPS distant : chaque page de boutique coûtait un
/// aller-retour (~1 s). Le catalogue change rarement (quand l'admin édite
/// un produit ou une catégorie) : on le met en cache côté serveur, tag
/// « catalog », et chaque écriture admin l'invalide. Entre deux
/// modifications, la boutique se sert sans toucher à la base. Le
/// filtrage par catégorie et la recherche se font ensuite dans le
/// navigateur, sans requête.
export type CatalogProduct = {
  id: string;
  slug: string;
  sku: string;
  title: string;
  description: string | null;
  price: number;
  tva: number;
  images: string[];
  categories: { name: string; slug: string }[];
};
export type CatalogCategory = { name: string; slug: string; count: number };

export const CATALOG_TAG = "catalog";

export const getCatalog = unstable_cache(
  async (): Promise<{ products: CatalogProduct[]; categories: CatalogCategory[] }> => {
    const [products, categories] = await Promise.all([
      db.product.findMany({
        where: { active: true },
        select: { id: true, slug: true, sku: true, title: true, description: true, price: true, tva: true, images: true, categories: { select: { name: true, slug: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.category.findMany({ select: { name: true, slug: true, _count: { select: { products: { where: { active: true } } } } }, orderBy: { name: "asc" } }),
    ]);
    return {
      products: products.map((p) => ({ ...p, price: Number(p.price), tva: Number(p.tva) })),
      categories: categories.filter((c) => c._count.products > 0).map((c) => ({ name: c.name, slug: c.slug, count: c._count.products })),
    };
  },
  ["catalog"],
  { tags: [CATALOG_TAG], revalidate: 600 },
);

export async function getProductBySlug(slug: string): Promise<CatalogProduct | null> {
  const { products } = await getCatalog();
  return products.find((p) => p.slug === slug) ?? null;
}

/// À appeler après toute écriture sur Product ou Category.
export function invalidateCatalog() {
  revalidateTag(CATALOG_TAG, "max");
}
