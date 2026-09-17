import { db } from "@/lib/db";
import { withApi, parseBody, ok } from "@/lib/apiError";
import { requireUser } from "@/lib/requireAuth";
import { orderCreateSchema } from "@/lib/validators";
import { createOrder } from "@/lib/orders";
import { audit } from "@/lib/audit";

export const orderSelect = {
  id: true, orderNumber: true, status: true, subTotal: true, taxTotal: true, total: true, claimReference: true, salesNo: true,
  receiptUrl: true, note: true, rejectionReason: true, validatedAt: true, createdAt: true,
  items: { select: { id: true, quantity: true, unitPrice: true, totalPrice: true, product: { select: { id: true, title: true, slug: true, images: true } } } },
} as const;

/// Mes commandes. La liste est TOUJOURS filtrée par l'utilisateur connecté :
/// pas de paramètre `userId` côté membre.
export const GET = withApi(async () => {
  const me = await requireUser();
  const orders = await db.order.findMany({ where: { userId: me.id }, select: orderSelect, orderBy: { createdAt: "desc" }, take: 100 });
  return ok(orders);
});

export const POST = withApi(async (req) => {
  const me = await requireUser();
  const input = await parseBody(req, orderCreateSchema);
  const order = await createOrder({ userId: me.id, ...input });
  await audit("order.created", { userId: me.id, target: order.id, req, meta: { orderNumber: order.orderNumber, total: order.total.toString() } });
  return ok(order, 201);
});
