import { db } from "@/lib/db";
import { withApi, parseBody, parseQuery, ok } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { stockMovementSchema, uuid } from "@/lib/validators";
import { adjustStock } from "@/lib/stock";
import { invalidateCatalog } from "@/lib/catalog";
import { audit } from "@/lib/audit";
import { z } from "zod";

const query = z.object({ productId: uuid.optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(200).default(100) });

export const GET = withApi(async (req) => {
  await requirePermission("stock", "view");
  const q = parseQuery(req, query);
  const where = q.productId ? { productId: q.productId } : {};
  const [items, total] = await Promise.all([
    db.stockMovement.findMany({ where, select: { id: true, quantity: true, reason: true, note: true, createdAt: true, product: { select: { id: true, title: true, sku: true } }, user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * q.limit, take: q.limit }),
    db.stockMovement.count({ where }),
  ]);
  return ok({ items, total, page: q.page, pages: Math.ceil(total / q.limit) });
});

export const POST = withApi(async (req) => {
  const admin = await requirePermission("stock", "edit");
  const input = await parseBody(req, stockMovementSchema);
  const stock = await adjustStock({ ...input, userId: admin.id });
  invalidateCatalog();
  await audit("stock.movement", { userId: admin.id, target: input.productId, req, meta: input });
  return ok({ stock });
});
