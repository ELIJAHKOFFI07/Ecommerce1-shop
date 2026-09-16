import { withApi, parseBody, ok } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { deliveryTvaSchema, uuid } from "@/lib/validators";
import { setDeliveryTva, payDeliveryTva } from "@/lib/deliveries";
import { audit } from "@/lib/audit";

export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requirePermission("deliveries", "edit");
  const id = uuid.parse((await params).id);
  const input = await parseBody(req, deliveryTvaSchema);
  if (input.action === "set") {
    const d = await setDeliveryTva({ deliveryId: id, tva: input.tva });
    return ok({ tva: d.tva });
  }
  const d = await payDeliveryTva({ deliveryId: id, paymentMethod: input.paymentMethod, adminId: admin.id });
  await audit("delivery.tva_paid", { userId: admin.id, target: id, req, meta: { method: input.paymentMethod, tva: d.tva?.toString() } });
  return ok({ tvaPaid: d.tvaPaid, tvaPaymentMethod: d.tvaPaymentMethod });
});
