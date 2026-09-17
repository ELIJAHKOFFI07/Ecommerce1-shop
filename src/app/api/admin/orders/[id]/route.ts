import { db } from "@/lib/db";
import { withApi, parseBody, ok, notFound, ApiError } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { uuid, longText } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const editSchema = z.object({
  claimReference: z.string().trim().min(3).max(60).regex(/^[A-Za-z0-9-_/ ]+$/).optional(),
  salesNo: z.string().trim().max(60).regex(/^[A-Za-z0-9-_/ ]*$/).optional().nullable(),
  note: longText.optional().nullable(),
});

/// Correction des références d'une commande EN ATTENTE (faute de frappe
/// du membre). Les lignes et montants ne se modifient pas : le membre
/// renvoie un reçu si le contenu est faux.
export const PATCH = withApi<Ctx>(async (req, { params }) => {
  const admin = await requirePermission("orders", "edit");
  const id = uuid.parse((await params).id);
  const input = await parseBody(req, editSchema);
  const o = await db.order.findUnique({ where: { id }, select: { status: true } });
  if (!o) throw notFound("Commande");
  if (o.status !== "PENDING") throw new ApiError(400, "Seule une commande en attente peut être corrigée.");
  if (input.claimReference) {
    const dup = await db.order.findFirst({ where: { claimReference: input.claimReference, NOT: { id } }, select: { id: true } });
    if (dup) throw new ApiError(409, "Cette Claim Reference existe déjà sur une autre commande.");
  }
  const updated = await db.order.update({ where: { id }, data: { ...input, salesNo: input.salesNo || null } });
  await audit("order.status", { userId: admin.id, target: id, req, meta: { edit: input } });
  return ok(updated);
});

/// Suppression : uniquement si aucun stock n'a bougé (en attente, rejetée
/// ou annulée sans validation préalable). Une commande validée reste
/// dans l'historique — on l'annule, on ne l'efface pas.
export const DELETE = withApi<Ctx>(async (req, { params }) => {
  const admin = await requirePermission("orders", "edit");
  const id = uuid.parse((await params).id);
  const o = await db.order.findUnique({ where: { id }, select: { status: true, validatedAt: true, orderNumber: true } });
  if (!o) throw notFound("Commande");
  if (o.validatedAt || !["PENDING", "REJECTED", "CANCELLED"].includes(o.status)) {
    throw new ApiError(400, "Cette commande a fait bouger le stock : annulez-la plutôt que de la supprimer.");
  }
  await db.order.delete({ where: { id } });
  await audit("order.status", { userId: admin.id, target: id, req, meta: { deleted: o.orderNumber } });
  return ok({ ok: true });
});
