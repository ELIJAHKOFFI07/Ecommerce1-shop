import { db } from "@/lib/db";
import { withApi, ok } from "@/lib/apiError";
import { requireUser } from "@/lib/requireAuth";

/// Mon stock personnel : produits validés, pas encore retirés.
export const GET = withApi(async () => {
  const me = await requireUser();
  const stocks = await db.userStock.findMany({
    where: { userId: me.id, quantity: { gt: 0 } },
    select: { quantity: true, product: { select: { id: true, title: true, slug: true, images: true, price: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return ok(stocks);
});
