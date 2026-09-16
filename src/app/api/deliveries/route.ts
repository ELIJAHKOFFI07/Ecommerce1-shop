import { db } from "@/lib/db";
import { withApi, parseBody, ok } from "@/lib/apiError";
import { requireUser } from "@/lib/requireAuth";
import { deliveryCreateSchema } from "@/lib/validators";
import { createDelivery } from "@/lib/deliveries";
import { audit } from "@/lib/audit";

export const deliverySelect = {
  id: true, status: true, recipientName: true, recipientPhone: true, tva: true, tvaPaid: true, tvaPaymentMethod: true,
  rejectionReason: true, approvedAt: true, deliveredAt: true, createdAt: true,
  items: { select: { id: true, quantity: true, product: { select: { id: true, title: true, images: true } } } },
} as const;

export const GET = withApi(async () => {
  const me = await requireUser();
  const list = await db.delivery.findMany({ where: { userId: me.id }, select: deliverySelect, orderBy: { createdAt: "desc" }, take: 100 });
  return ok(list);
});

export const POST = withApi(async (req) => {
  const me = await requireUser();
  const input = await parseBody(req, deliveryCreateSchema);
  const d = await createDelivery({ userId: me.id, ...input });
  await audit("delivery.created", { userId: me.id, target: d.id, req });
  return ok(d, 201);
});
