import { withApi, parseBody, ok } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { supplyStatusSchema, uuid } from "@/lib/validators";
import { receiveSupplyOrder, cancelSupplyOrder } from "@/lib/stock";
import { audit } from "@/lib/audit";

export const PATCH = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requirePermission("stock", "edit");
  const id = uuid.parse((await params).id);
  const input = await parseBody(req, supplyStatusSchema);
  const so =
    input.status === "RECEIVED"
      ? await receiveSupplyOrder({ id, quantityBureau: input.quantityBureau, quantityEntrepot: input.quantityEntrepot, userId: admin.id })
      : await cancelSupplyOrder({ id, userId: admin.id });
  await audit("supply.status", { userId: admin.id, target: id, req, meta: input });
  return ok(so);
});
