import { db } from "@/lib/db";
import { withApi, parseBody, ok, notFound, ApiError } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { productUpdateSchema, uuid } from "@/lib/validators";
import { adminProductSelect } from "../route";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApi<Ctx>(async (_req, { params }) => {
  await requirePermission("products", "view");
  const id = uuid.parse((await params).id);
  const p = await db.product.findUnique({
    where: { id },
    select: { ...adminProductSelect, stockMovements: { select: { id: true, location: true, quantity: true, reason: true, note: true, createdAt: true, user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 50 } },
  });
  if (!p) throw notFound("Produit");
  return ok(p);
});

export const PATCH = withApi<Ctx>(async (req, { params }) => {
  await requirePermission("products", "edit");
  const id = uuid.parse((await params).id);
  const input = await parseBody(req, productUpdateSchema);
  const { categoryIds, ...data } = input;
  if (data.sku || data.slug) {
    const clash = await db.product.findFirst({
      where: { NOT: { id }, OR: [...(data.sku ? [{ sku: data.sku }] : []), ...(data.slug ? [{ slug: data.slug }] : [])] },
      select: { id: true },
    });
    if (clash) throw new ApiError(409, "Référence ou nom déjà utilisé par un autre produit.");
  }
  const p = await db.product.update({
    where: { id },
    data: { ...data, ...(categoryIds ? { categories: { set: categoryIds.map((cid) => ({ id: cid })) } } : {}) },
    select: adminProductSelect,
  });
  return ok(p);
});

/// Suppression réelle si le produit n'a AUCUN historique (jamais commandé,
/// jamais de mouvement). Sinon il reste consultable : on le retire de la
/// vente. La réponse dit lequel des deux s'est produit.
export const DELETE = withApi<Ctx>(async (_req, { params }) => {
  await requirePermission("products", "edit");
  const id = uuid.parse((await params).id);
  const p = await db.product.findUnique({
    where: { id },
    select: { _count: { select: { orderItems: true, deliveryItems: true, stockMovements: true, userStocks: true, supplyOrders: true, conversionsFrom: true, conversionsTo: true } } },
  });
  if (!p) throw notFound("Produit");
  const c = p._count;
  const hasHistory = c.orderItems || c.deliveryItems || c.stockMovements || c.userStocks || c.supplyOrders || c.conversionsFrom || c.conversionsTo;
  if (hasHistory) {
    await db.product.update({ where: { id }, data: { active: false } });
    return ok({ deleted: false, message: "Ce produit a un historique : il est retiré de la vente, pas supprimé." });
  }
  await db.product.delete({ where: { id } });
  return ok({ deleted: true });
});
