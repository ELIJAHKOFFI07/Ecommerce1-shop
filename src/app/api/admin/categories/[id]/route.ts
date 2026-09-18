import { db } from "@/lib/db";
import { withApi, parseBody, ok, ApiError } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { categorySchema, uuid } from "@/lib/validators";
import { invalidateCatalog } from "@/lib/catalog";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApi<Ctx>(async (req, { params }) => {
  await requirePermission("categories", "edit");
  const id = uuid.parse((await params).id);
  const input = await parseBody(req, categorySchema.partial());
  const c = await db.category.update({ where: { id }, data: input });
  invalidateCatalog();
  return ok(c);
});

export const DELETE = withApi<Ctx>(async (_req, { params }) => {
  await requirePermission("categories", "edit");
  const id = uuid.parse((await params).id);
  const count = await db.product.count({ where: { categories: { some: { id } } } });
  if (count > 0) throw new ApiError(400, `${count} produit(s) sont dans cette catégorie. Déplacez-les d'abord.`);
  await db.category.delete({ where: { id } });
  invalidateCatalog();
  return ok({ ok: true });
});
