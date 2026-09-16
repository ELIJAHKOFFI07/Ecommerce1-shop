import { db } from "@/lib/db";
import { withApi, parseQuery, ok } from "@/lib/apiError";
import { listQuery } from "@/lib/validators";

/// Catalogue public. Seuls les produits actifs, sans les colonnes de stock
/// interne ni la commission : un visiteur voit prix, images, description.
export const productPublicSelect = {
  id: true, sku: true, title: true, slug: true, description: true, price: true, tva: true, images: true,
  categories: { select: { name: true, slug: true } },
} as const;

export const GET = withApi(async (req) => {
  const q = parseQuery(req, listQuery);
  const where = {
    active: true,
    ...(q.q ? { OR: [{ title: { contains: q.q, mode: "insensitive" as const } }, { sku: { contains: q.q, mode: "insensitive" as const } }] } : {}),
    ...(q.category ? { categories: { some: { slug: q.category } } } : {}),
  };
  const [items, total] = await Promise.all([
    db.product.findMany({ where, select: productPublicSelect, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * q.limit, take: q.limit }),
    db.product.count({ where }),
  ]);
  return ok({ items, total, page: q.page, pages: Math.ceil(total / q.limit) });
});
