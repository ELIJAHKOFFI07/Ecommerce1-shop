import { db } from "@/lib/db";
import { withApi, parseBody, ok } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { orderStatusSchema, uuid } from "@/lib/validators";
import { transitionOrder } from "@/lib/orders";
import { invalidateCatalog } from "@/lib/catalog";
import { audit } from "@/lib/audit";
import { sendOrderStatus } from "@/lib/email";

export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requirePermission("orders", "edit");
  const id = uuid.parse((await params).id);
  const input = await parseBody(req, orderStatusSchema);
  const order = await transitionOrder({ orderId: id, status: input.status, cancelReason: input.cancelReason, actorId: admin.id });
  invalidateCatalog(); // le stock (et donc « en stock ») a pu changer
  await audit("order.status", { userId: admin.id, target: id, req, meta: { status: input.status } });
  const user = await db.user.findUnique({ where: { id: order.userId }, select: { email: true, name: true } });
  if (user) void sendOrderStatus(user.email, user.name, order);
  return ok(order);
});
