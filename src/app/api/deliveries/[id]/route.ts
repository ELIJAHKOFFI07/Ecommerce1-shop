import { db } from "@/lib/db";
import { withApi, ok, notFound } from "@/lib/apiError";
import { requireUser, assertOwnerOrStaff } from "@/lib/requireAuth";
import { uuid } from "@/lib/validators";
import { deliverySelect } from "../route";

export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const me = await requireUser();
  const id = uuid.parse((await params).id);
  const d = await db.delivery.findUnique({
    where: { id },
    select: { ...deliverySelect, userId: true, user: { select: { name: true, memberNumber: true, phone: true } }, approvedBy: { select: { name: true } }, deliveredBy: { select: { name: true } } },
  });
  if (!d) throw notFound("Retrait");
  try {
    assertOwnerOrStaff(me, d.userId);
  } catch {
    throw notFound("Retrait");
  }
  return ok(d);
});
