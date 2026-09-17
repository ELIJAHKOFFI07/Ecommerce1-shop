import { db } from "@/lib/db";
import { withApi, ok, notFound, ApiError } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { uuid } from "@/lib/validators";
import { audit } from "@/lib/audit";

/// Suppression d'un retrait qui n'a rien fait bouger (en attente ou refusé).
export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requirePermission("deliveries", "edit");
  const id = uuid.parse((await params).id);
  const d = await db.delivery.findUnique({ where: { id }, select: { status: true, tvaPaid: true } });
  if (!d) throw notFound("Retrait");
  if (!["PENDING", "REJECTED"].includes(d.status) || d.tvaPaid) {
    throw new ApiError(400, "Ce retrait a été approuvé ou payé : il reste dans l’historique.");
  }
  await db.delivery.delete({ where: { id } });
  await audit("delivery.status", { userId: admin.id, target: id, req, meta: { deleted: true } });
  return ok({ ok: true });
});
