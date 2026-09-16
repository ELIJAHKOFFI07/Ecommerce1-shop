import { db } from "@/lib/db";
import { withApi, ok } from "@/lib/apiError";

export const GET = withApi(async () => {
  const categories = await db.category.findMany({
    select: { id: true, name: true, slug: true, image: true, parentId: true, _count: { select: { products: { where: { active: true } } } } },
    orderBy: { name: "asc" },
  });
  return ok(categories);
});
