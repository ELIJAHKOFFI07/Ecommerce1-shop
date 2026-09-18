import { getCatalog } from "@/lib/catalog";
import { withApi, parseQuery, ok } from "@/lib/apiError";
import { listQuery } from "@/lib/validators";

/// Catalogue public (depuis le cache).
export const GET = withApi(async (req) => {
  const q = parseQuery(req, listQuery);
  const { products } = await getCatalog();
  const needle = q.q?.toLowerCase();
  const list = products.filter((p) => (!q.category || p.categories.some((c) => c.slug === q.category)) && (!needle || p.title.toLowerCase().includes(needle)));
  const start = (q.page - 1) * q.limit;
  return ok({ items: list.slice(start, start + q.limit), total: list.length, page: q.page, pages: Math.ceil(list.length / q.limit) });
});
