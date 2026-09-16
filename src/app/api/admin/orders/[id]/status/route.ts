import { db } from "@/lib/db";
import { withApi, parseBody, ok } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { orderStatusSchema, uuid } from "@/lib/validators";
import { transitionOrder } from "@/lib/orders";
import { audit } from "@/lib/audit";
import { sendOrderStatus } from "@/lib/email";

export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requirePermission("orders", "edit");
  const id = uuid.parse((await params).id);
  const input = await parseBody(req, orderStatusSchema);
  const order = await transitionOrder({ orderId: id, status: input.status, rejectionReason: input.rejectionReason, adminId: admin.id });
  await audit("order.status", { userId: admin.id, target: id, req, meta: { status: input.status } });
  // E-mail APRÈS la transaction : un envoi dans la transaction partirait
  // même si celle-ci était annulée.
  const user = await db.user.findUnique({ where: { id: order.userId }, select: { email: true, name: true } });
  if (user) void sendOrderStatus(user.email, user.name, order.orderNumber, order.status, order.rejectionReason);
  return ok(order);
});
