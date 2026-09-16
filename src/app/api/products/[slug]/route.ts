import { db } from "@/lib/db";
import { withApi, ok, notFound } from "@/lib/apiError";
import { productPublicSelect } from "../route";

export const GET = withApi<{ params: Promise<{ slug: string }> }>(async (_req, { params }) => {
  const { slug } = await params;
  const product = await db.product.findFirst({ where: { slug, active: true }, select: productPublicSelect });
  if (!product) throw notFound("Produit");
  return ok(product);
});
