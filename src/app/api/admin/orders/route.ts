import { db } from "@/lib/db";
import { withApi, parseQuery, ok } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { orderListQuery } from "@/lib/validators";
import { orderSelect } from "@/app/api/orders/route";

export const GET = withApi(async (req) => {
  await requirePermission("orders", "view");
  const q = parseQuery(req, orderListQuery);
  const where = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.userId ? { userId: q.userId } : {}),
    ...(q.q ? { OR: [{ orderNumber: { contains: q.q.toUpperCase() } }, { shipFullName: { contains: q.q, mode: "insensitive" as const } }, { shipPhone: { contains: q.q } }, { user: { email: { contains: q.q.toLowerCase() } } }] } : {}),
  };
  const [items, total] = await Promise.all([
    db.order.findMany({ where, select: { ...orderSelect, user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * q.limit, take: q.limit }),
    db.order.count({ where }),
  ]);
  return ok({ items, total, page: q.page, pages: Math.ceil(total / q.limit) });
});
