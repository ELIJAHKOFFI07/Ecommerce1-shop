import { db } from "@/lib/db";
import { withApi, parseBody, ok, notFound, ApiError } from "@/lib/apiError";
import { requirePermission, requireSuperAdmin } from "@/lib/requireAuth";
import { adminUserUpdateSchema, uuid } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { adminUserSelect } from "../route";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApi<Ctx>(async (_req, { params }) => {
  await requirePermission("users", "view");
  const id = uuid.parse((await params).id);
  const user = await db.user.findUnique({ where: { id }, select: { ...adminUserSelect, addresses: true, permissions: { select: { canView: true, canEdit: true, module: { select: { slug: true, name: true } } } } } });
  if (!user) throw notFound("Utilisateur");
  return ok(user);
});

/// Le rôle ne change que par le SUPER_ADMIN ; personne ne se bloque ni ne
/// se rétrograde soi-même ; un admin ordinaire ne touche pas au staff.
export const PATCH = withApi<Ctx>(async (req, { params }) => {
  const admin = await requirePermission("users", "edit");
  const id = uuid.parse((await params).id);
  const input = await parseBody(req, adminUserUpdateSchema);
  const target = await db.user.findUnique({ where: { id }, select: { role: true, blocked: true } });
  if (!target) throw notFound("Utilisateur");
  if (input.role !== undefined && input.role !== target.role) {
    await requireSuperAdmin();
    if (id === admin.id) throw new ApiError(400, "Vous ne pouvez pas changer votre propre rôle.");
  }
  if (input.blocked !== undefined && id === admin.id) throw new ApiError(400, "Vous ne pouvez pas bloquer votre propre compte.");
  if (admin.role !== "SUPER_ADMIN" && target.role !== "CLIENT") throw new ApiError(403, "Seul le super administrateur modifie un compte de l'équipe.");
  const user = await db.user.update({ where: { id }, data: input, select: adminUserSelect });
  if (input.role !== undefined && input.role !== target.role) await audit("user.role_changed", { userId: admin.id, target: id, req, meta: { from: target.role, to: input.role } });
  if (input.blocked !== undefined && input.blocked !== target.blocked) await audit(input.blocked ? "user.blocked" : "user.unblocked", { userId: admin.id, target: id, req });
  return ok(user);
});

/// Suppression : refusée si le compte a des commandes (historique). Bloquez-le.
export const DELETE = withApi<Ctx>(async (req, { params }) => {
  const admin = await requirePermission("users", "edit");
  const id = uuid.parse((await params).id);
  if (id === admin.id) throw new ApiError(400, "Vous ne pouvez pas supprimer votre propre compte.");
  const u = await db.user.findUnique({ where: { id }, select: { role: true, name: true, _count: { select: { orders: true } } } });
  if (!u) throw notFound("Utilisateur");
  if (admin.role !== "SUPER_ADMIN" && u.role !== "CLIENT") throw new ApiError(403, "Seul le super administrateur supprime un compte de l'équipe.");
  if (u._count.orders > 0) throw new ApiError(400, "Ce compte a des commandes : bloquez-le plutôt que de le supprimer.");
  await db.user.delete({ where: { id } });
  await audit("user.deleted", { userId: admin.id, target: id, req, meta: { name: u.name } });
  return ok({ ok: true });
});
