import { db } from "@/lib/db";
import { invalidateCatalog } from "@/lib/catalog";
import { withApi, parseBody, parseQuery, ok, ApiError } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { productSchema, listQuery } from "@/lib/validators";
import { slugify } from "@/lib/ids";

export const adminProductSelect = {
  id: true, sku: true, title: true, slug: true, description: true, price: true, tva: true, commission: true, images: true, active: true,
  stockVirtuel: true, stockDisponible: true, stockBureau: true, stockEntrepot: true, lowStockAlert: true, createdAt: true,
  categories: { select: { id: true, name: true, slug: true } },
} as const;

export const GET = withApi(async (req) => {
  await requirePermission("products", "view");
  const q = parseQuery(req, listQuery);
  const where = q.q ? { OR: [{ title: { contains: q.q, mode: "insensitive" as const } }, { sku: { contains: q.q, mode: "insensitive" as const } }] } : {};
  const [items, total] = await Promise.all([
    db.product.findMany({ where, select: adminProductSelect, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * q.limit, take: q.limit }),
    db.product.count({ where }),
  ]);
  return ok({ items, total, page: q.page, pages: Math.ceil(total / q.limit) });
});

export const POST = withApi(async (req) => {
  await requirePermission("products", "edit");
  const input = await parseBody(req, productSchema);
  const slug = input.slug ?? slugify(input.title);
  const clash = await db.product.findFirst({ where: { OR: [{ sku: input.sku }, { slug }] }, select: { sku: true } });
  if (clash) throw new ApiError(409, clash.sku === input.sku ? "Cette référence (SKU) existe déjà." : "Ce nom de produit existe déjà.");
  const { categoryIds, ...data } = input;
  const product = await db.product.create({
    data: { ...data, slug, categories: { connect: categoryIds.map((id) => ({ id })) } },
    select: adminProductSelect,
  });
  invalidateCatalog();
  return ok(product, 201);
});
