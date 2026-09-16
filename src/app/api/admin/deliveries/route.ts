import { db } from "@/lib/db";
import { withApi, parseQuery, ok } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { z } from "zod";
import { deliverySelect } from "@/app/api/deliveries/route";

const query = z.object({
  status: z.enum(["PENDING", "APPROVED", "DELIVERED", "REJECTED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const GET = withApi(async (req) => {
  await requirePermission("deliveries", "view");
  const q = parseQuery(req, query);
  const where = q.status ? { status: q.status } : {};
  const [items, total] = await Promise.all([
    db.delivery.findMany({
      where,
      select: { ...deliverySelect, user: { select: { id: true, name: true, memberNumber: true, phone: true } } },
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    db.delivery.count({ where }),
  ]);
  return ok({ items, total, page: q.page, pages: Math.ceil(total / q.limit) });
});
