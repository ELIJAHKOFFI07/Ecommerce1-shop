import { db, TX } from "@/lib/db";
import { withApi, parseBody, parseQuery, ok } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { stockMovementSchema, uuid } from "@/lib/validators";
import { move } from "@/lib/stock";
import { audit } from "@/lib/audit";
import { z } from "zod";

const query = z.object({
  productId: uuid.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const GET = withApi(async (req) => {
  await requirePermission("stock", "view");
  const q = parseQuery(req, query);
  const where = q.productId ? { productId: q.productId } : {};
  const [items, total] = await Promise.all([
    db.stockMovement.findMany({
      where,
      select: { id: true, location: true, quantity: true, reason: true, note: true, createdAt: true, product: { select: { id: true, title: true, sku: true } }, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    db.stockMovement.count({ where }),
  ]);
  return ok({ items, total, page: q.page, pages: Math.ceil(total / q.limit) });
});

/// Ajustement manuel d'un emplacement.
export const POST = withApi(async (req) => {
  const admin = await requirePermission("stock", "edit");
  const input = await parseBody(req, stockMovementSchema);
  const next = await db.$transaction((tx) => move(tx, { ...input, userId: admin.id, allowNegative: input.location === "VIRTUEL" }), TX);
  await audit("stock.movement", { userId: admin.id, target: input.productId, req, meta: input });
  return ok({ quantity: next });
});
