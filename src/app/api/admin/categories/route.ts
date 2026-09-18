import { db } from "@/lib/db";
import { withApi, parseBody, ok, ApiError } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { categorySchema } from "@/lib/validators";
import { invalidateCatalog } from "@/lib/catalog";
import { slugify } from "../products/route";

export const POST = withApi(async (req) => {
  await requirePermission("categories", "edit");
  const input = await parseBody(req, categorySchema);
  const slug = input.slug ?? slugify(input.name);
  if (await db.category.findUnique({ where: { slug }, select: { id: true } })) throw new ApiError(409, "Cette catégorie existe déjà.");
  const c = await db.category.create({ data: { name: input.name, slug, image: input.image ?? null, position: input.position ?? 0 } });
  invalidateCatalog();
  return ok(c, 201);
});
