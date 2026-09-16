import { db } from "@/lib/db";
import { withApi, parseBody, ok } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { supplyCreateSchema } from "@/lib/validators";
import { createSupplyOrder } from "@/lib/stock";
import { audit } from "@/lib/audit";

export const supplySelect = {
  id: true, quantity: true, quantityBureau: true, quantityEntrepot: true, status: true, note: true, createdAt: true, receivedAt: true,
  product: { select: { id: true, title: true, sku: true } },
  createdBy: { select: { name: true } },
  receivedBy: { select: { name: true } },
} as const;

export const GET = withApi(async () => {
  await requirePermission("stock", "view");
  const list = await db.supplyOrder.findMany({ select: supplySelect, orderBy: { createdAt: "desc" }, take: 200 });
  return ok(list);
});

export const POST = withApi(async (req) => {
  const admin = await requirePermission("stock", "edit");
  const input = await parseBody(req, supplyCreateSchema);
  const so = await createSupplyOrder({ ...input, userId: admin.id });
  await audit("supply.created", { userId: admin.id, target: so.id, req, meta: input });
  return ok(so, 201);
});
