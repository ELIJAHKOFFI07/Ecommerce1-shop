import { db } from "@/lib/db";
import { withApi, ok, notFound } from "@/lib/apiError";
import { requireUser, assertOwnerOrStaff } from "@/lib/requireAuth";
import { uuid } from "@/lib/validators";
import { orderSelect } from "../route";

export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const me = await requireUser();
  const id = uuid.parse((await params).id);
  const order = await db.order.findUnique({ where: { id }, select: { ...orderSelect, userId: true, user: { select: { name: true, memberNumber: true } } } });
  if (!order) throw notFound("Commande");
  // Un 404 plutôt qu'un 403 quand ce n'est pas la sienne : ne pas confirmer
  // à un curieux que l'identifiant existe.
  try {
    assertOwnerOrStaff(me, order.userId);
  } catch {
    throw notFound("Commande");
  }
  return ok(order);
});
