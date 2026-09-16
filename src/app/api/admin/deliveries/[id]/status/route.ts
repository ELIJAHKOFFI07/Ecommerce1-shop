import { db } from "@/lib/db";
import { withApi, parseBody, ok } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { deliveryStatusSchema, uuid } from "@/lib/validators";
import { transitionDelivery } from "@/lib/deliveries";
import { audit } from "@/lib/audit";
import { sendDeliveryStatus } from "@/lib/email";

export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requirePermission("deliveries", "edit");
  const id = uuid.parse((await params).id);
  const input = await parseBody(req, deliveryStatusSchema);
  const d = await transitionDelivery({ deliveryId: id, status: input.status, rejectionReason: input.rejectionReason, adminId: admin.id });
  await audit("delivery.status", { userId: admin.id, target: id, req, meta: { status: input.status } });
  const user = await db.user.findUnique({ where: { id: d.userId }, select: { email: true, name: true } });
  if (user) void sendDeliveryStatus(user.email, user.name, d.status, d.rejectionReason);
  return ok(d);
});
