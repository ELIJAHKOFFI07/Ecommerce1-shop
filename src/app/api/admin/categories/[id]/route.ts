import { db } from "@/lib/db";
import { invalidateCatalog } from "@/lib/catalog";
import { withApi, parseBody, ok, ApiError } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { categorySchema, uuid } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApi<Ctx>(async (req, { params }) => {
  await requirePermission("categories", "edit");
  const id = uuid.parse((await params).id);
  const input = await parseBody(req, categorySchema.partial());
  if (input.parentId === id) throw new ApiError(400, "Une catégorie ne peut pas être sa propre parente.");
  const c = await db.category.update({ where: { id }, data: input });
  invalidateCatalog();
  return ok(c);
});

export const DELETE = withApi<Ctx>(async (_req, { params }) => {
  await requirePermission("categories", "edit");
  const id = uuid.parse((await params).id);
  const count = await db.product.count({ where: { categories: { some: { id } } } });
  if (count > 0) throw new ApiError(400, `${count} produit(s) utilisent encore cette catégorie. Réaffectez-les d'abord.`);
  await db.category.delete({ where: { id } });
  invalidateCatalog();
  return ok({ ok: true });
});
