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

/// Pas de suppression physique : un produit lié à des commandes ou des
/// mouvements de stock doit rester consultable. On le désactive.
export const DELETE = withApi<Ctx>(async (_req, { params }) => {
  await requirePermission("products", "edit");
  const id = uuid.parse((await params).id);
  await db.product.update({ where: { id }, data: { active: false } });
  return ok({ ok: true });
});
