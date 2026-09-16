import { withApi, parseBody, ok } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { stockTransferSchema } from "@/lib/validators";
import { transferStock } from "@/lib/stock";
import { audit } from "@/lib/audit";

export const POST = withApi(async (req) => {
  const admin = await requirePermission("stock", "edit");
  const input = await parseBody(req, stockTransferSchema);
  await transferStock({ ...input, userId: admin.id });
  await audit("stock.transfer", { userId: admin.id, target: input.productId, req, meta: input });
  return ok({ ok: true });
});
