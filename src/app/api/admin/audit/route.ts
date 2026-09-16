import { db } from "@/lib/db";
import { withApi, parseQuery, ok } from "@/lib/apiError";
import { requireSuperAdmin } from "@/lib/requireAuth";
import { z } from "zod";

const query = z.object({
  action: z.string().max(40).optional(),
  userId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

/// Journal d'audit — lecture seule, SUPER_ADMIN uniquement.
export const GET = withApi(async (req) => {
  await requireSuperAdmin();
  const q = parseQuery(req, query);
  const where = { ...(q.action ? { action: { startsWith: q.action } } : {}), ...(q.userId ? { userId: q.userId } : {}) };
  const [items, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      select: { id: true, action: true, target: true, ip: true, meta: true, createdAt: true, user: { select: { name: true, memberNumber: true } } },
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    db.auditLog.count({ where }),
  ]);
  return ok({ items, total, page: q.page, pages: Math.ceil(total / q.limit) });
});
