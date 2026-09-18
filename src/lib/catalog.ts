import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "./db";

/// Catalogue public, en cache serveur (tag « catalog »), invalidé à chaque
/// écriture admin sur produits, catégories ou stock. La boutique se sert
/// sans toucher à la base ; recherche et filtres se font dans le
/// navigateur.
export type CatalogProduct = {
  id: string;
  slug: string;
  sku: string;
  title: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  featured: boolean;
  inStock: boolean;
  categories: { name: string; slug: string }[];
};
export type CatalogCategory = { name: string; slug: string; image: string | null; count: number };

export const CATALOG_TAG = "catalog";

export const getCatalog = unstable_cache(
  async (): Promise<{ products: CatalogProduct[]; categories: CatalogCategory[]; settings: { siteName: string; shippingFee: number; freeShippingThreshold: number | null } }> => {
    const [products, categories, settings] = await Promise.all([
      db.product.findMany({
        where: { active: true },
        select: { id: true, slug: true, sku: true, title: true, description: true, price: true, compareAtPrice: true, images: true, featured: true, stock: true, categories: { select: { name: true, slug: true } } },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      }),
      db.category.findMany({ select: { name: true, slug: true, image: true, _count: { select: { products: { where: { active: true } } } } }, orderBy: [{ position: "asc" }, { name: "asc" }] }),
      db.settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {}, select: { siteName: true, shippingFee: true, freeShippingThreshold: true } }),
    ]);
    return {
      products: products.map(({ stock, ...p }) => ({ ...p, price: Number(p.price), compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null, inStock: stock > 0 })),
      categories: categories.filter((c) => c._count.products > 0).map((c) => ({ name: c.name, slug: c.slug, image: c.image, count: c._count.products })),
      settings: { siteName: settings.siteName, shippingFee: Number(settings.shippingFee), freeShippingThreshold: settings.freeShippingThreshold ? Number(settings.freeShippingThreshold) : null },
    };
  },
  ["catalog"],
  { tags: [CATALOG_TAG], revalidate: 600 },
);

export async function getProductBySlug(slug: string): Promise<CatalogProduct | null> {
  const { products } = await getCatalog();
  return products.find((p) => p.slug === slug) ?? null;
}

export function invalidateCatalog() {
  revalidateTag(CATALOG_TAG, "max");
}
