import { db } from "@/lib/db";
import { withApi, parseBody, ok, notFound } from "@/lib/apiError";
import { requireUser } from "@/lib/requireAuth";
import { uuid, longText } from "@/lib/validators";
import { transitionOrder } from "@/lib/orders";
import { audit } from "@/lib/audit";
import { orderSelect } from "../route";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApi<Ctx>(async (_req, { params }) => {
  const me = await requireUser();
  const id = uuid.parse((await params).id);
  // Filtré par userId : la commande d'un autre est introuvable (404, pas 403).
  const order = await db.order.findFirst({ where: { id, userId: me.id }, select: orderSelect });
  if (!order) throw notFound("Commande");
  return ok(order);
});

/// Le client annule lui-même tant que la commande n'est pas expédiée.
export const PATCH = withApi<Ctx>(async (req, { params }) => {
  const me = await requireUser();
  const id = uuid.parse((await params).id);
  const { cancelReason } = await parseBody(req, z.object({ cancelReason: longText.min(3) }));
  const own = await db.order.findFirst({ where: { id, userId: me.id }, select: { id: true } });
  if (!own) throw notFound("Commande");
  const order = await transitionOrder({ orderId: id, status: "CANCELLED", cancelReason, actorId: me.id, byCustomer: true });
  await audit("order.status", { userId: me.id, target: id, req, meta: { status: "CANCELLED", byCustomer: true } });
  return ok(order);
});
