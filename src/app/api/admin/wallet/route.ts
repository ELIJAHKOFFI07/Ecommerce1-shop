import { db } from "@/lib/db";
import { withApi, parseQuery, ok } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { listQuery } from "@/lib/validators";

/// Tous les portefeuilles, avec recherche par nom / numéro / e-mail.
export const GET = withApi(async (req) => {
  await requirePermission("wallet", "view");
  const q = parseQuery(req, listQuery);
  const where = q.q
    ? { user: { OR: [{ name: { contains: q.q, mode: "insensitive" as const } }, { memberNumber: { contains: q.q.toUpperCase() } }, { email: { contains: q.q.toLowerCase() } }] } }
    : {};
  const [items, total, settings] = await Promise.all([
    db.wallet.findMany({
      where,
      select: { id: true, balance: true, updatedAt: true, user: { select: { id: true, name: true, memberNumber: true, email: true, blocked: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    db.wallet.count({ where }),
    db.settings.findUnique({ where: { id: 1 }, select: { generalBalance: true, taxBalance: true, systemBalance: true } }),
  ]);
  return ok({ items, total, page: q.page, pages: Math.ceil(total / q.limit), settings });
});
