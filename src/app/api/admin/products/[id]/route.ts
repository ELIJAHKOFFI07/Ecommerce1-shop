import { db } from "@/lib/db";
import { withApi, parseBody, ok, notFound, ApiError } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { productUpdateSchema, uuid } from "@/lib/validators";
import { invalidateCatalog } from "@/lib/catalog";
import { audit } from "@/lib/audit";
import { adminProductSelect } from "../route";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApi<Ctx>(async (_req, { params }) => {
  await requirePermission("products", "view");
  const id = uuid.parse((await params).id);
  const p = await db.product.findUnique({ where: { id }, select: { ...adminProductSelect, stockMovements: { select: { id: true, quantity: true, reason: true, note: true, createdAt: true, user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 50 } } });
  if (!p) throw notFound("Produit");
  return ok(p);
});

export const PATCH = withApi<Ctx>(async (req, { params }) => {
  const admin = await requirePermission("products", "edit");
  const id = uuid.parse((await params).id);
  const input = await parseBody(req, productUpdateSchema);
  const { categoryIds, ...data } = input;
  if (data.sku || data.slug) {
    const clash = await db.product.findFirst({ where: { NOT: { id }, OR: [...(data.sku ? [{ sku: data.sku }] : []), ...(data.slug ? [{ slug: data.slug }] : [])] }, select: { id: true } });
    if (clash) throw new ApiError(409, "Référence ou nom déjà utilisé par un autre produit.");
  }
  const p = await db.product.update({ where: { id }, data: { ...data, ...(categoryIds ? { categories: { set: categoryIds.map((cid) => ({ id: cid })) } } : {}) }, select: adminProductSelect });
  invalidateCatalog();
  await audit("product.updated", { userId: admin.id, target: id, req });
  return ok(p);
});

/// Suppression réelle si aucune commande ne référence le produit ; sinon
/// retrait de la vente (l'historique des commandes doit rester lisible).
export const DELETE = withApi<Ctx>(async (req, { params }) => {
  const admin = await requirePermission("products", "edit");
  const id = uuid.parse((await params).id);
  const p = await db.product.findUnique({ where: { id }, select: { _count: { select: { orderItems: true } } } });
  if (!p) throw notFound("Produit");
  if (p._count.orderItems > 0) {
    await db.product.update({ where: { id }, data: { active: false } });
    invalidateCatalog();
    return ok({ deleted: false, message: "Ce produit figure dans des commandes : il est retiré de la vente, pas supprimé." });
  }
  await db.product.delete({ where: { id } });
  invalidateCatalog();
  await audit("product.deleted", { userId: admin.id, target: id, req });
  return ok({ deleted: true });
});
