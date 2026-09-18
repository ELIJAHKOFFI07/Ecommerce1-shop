import { db } from "@/lib/db";
import { withApi, parseBody, ok, notFound, ApiError } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { uuid, orderPaymentSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

/// Paiement : marquer un Mobile Money reçu (avec référence), ou remboursé.
export const PATCH = withApi<Ctx>(async (req, { params }) => {
  const admin = await requirePermission("orders", "edit");
  const id = uuid.parse((await params).id);
  const input = await parseBody(req, orderPaymentSchema);
  const o = await db.order.findUnique({ where: { id }, select: { id: true } });
  if (!o) throw notFound("Commande");
  const updated = await db.order.update({ where: { id }, data: { paymentStatus: input.paymentStatus, paymentRef: input.paymentRef ?? undefined } });
  await audit("order.payment", { userId: admin.id, target: id, req, meta: input });
  return ok(updated);
});

/// Suppression : uniquement une commande annulée (aucun stock en jeu).
export const DELETE = withApi<Ctx>(async (req, { params }) => {
  const admin = await requirePermission("orders", "edit");
  const id = uuid.parse((await params).id);
  const o = await db.order.findUnique({ where: { id }, select: { status: true, orderNumber: true } });
  if (!o) throw notFound("Commande");
  if (o.status !== "CANCELLED") throw new ApiError(400, "Seule une commande annulée peut être supprimée. Annulez-la d'abord.");
  await db.order.delete({ where: { id } });
  await audit("order.deleted", { userId: admin.id, target: id, req, meta: { orderNumber: o.orderNumber } });
  return ok({ ok: true });
});
