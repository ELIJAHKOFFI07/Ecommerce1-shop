import { getProductBySlug } from "@/lib/catalog";
import { withApi, ok, notFound } from "@/lib/apiError";

export const GET = withApi<{ params: Promise<{ slug: string }> }>(async (_req, { params }) => {
  const p = await getProductBySlug((await params).slug);
  if (!p) throw notFound("Produit");
  return ok(p);
});
