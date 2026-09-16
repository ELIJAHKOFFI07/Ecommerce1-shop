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
  const user = await db.user.findUnique({
    where: { id },
    select: {
      ...adminUserSelect,
      referrals: { select: { id: true, name: true, memberNumber: true, createdAt: true }, take: 50 },
      stocks: { where: { quantity: { gt: 0 } }, select: { quantity: true, product: { select: { title: true } } } },
      permissions: { select: { canView: true, canEdit: true, module: { select: { slug: true, name: true } } } },
    },
  });
  if (!user) throw notFound("Membre");
  return ok(user);
});

/// Rôle et blocage sont des actions à part : seul le SUPER_ADMIN change un
/// rôle, et personne ne peut se bloquer ou se rétrograder soi-même — sinon
/// le dernier super-admin pourrait verrouiller tout le monde dehors.
export const PATCH = withApi<Ctx>(async (req, { params }) => {
  const admin = await requirePermission("users", "edit");
  const id = uuid.parse((await params).id);
  const input = await parseBody(req, adminUserUpdateSchema);

  const target = await db.user.findUnique({ where: { id }, select: { role: true, blocked: true } });
  if (!target) throw notFound("Membre");

  if (input.role !== undefined && input.role !== target.role) {
    await requireSuperAdmin();
    if (id === admin.id) throw new ApiError(400, "Vous ne pouvez pas changer votre propre rôle.");
  }
  if (input.blocked !== undefined && id === admin.id) throw new ApiError(400, "Vous ne pouvez pas bloquer votre propre compte.");
  // Un admin ordinaire ne touche pas aux comptes staff.
  if (admin.role !== "SUPER_ADMIN" && target.role !== "CLIENT") throw new ApiError(403, "Seul le super administrateur modifie un compte de l'équipe.");

  const user = await db.user.update({ where: { id }, data: input, select: adminUserSelect });

  if (input.role !== undefined && input.role !== target.role) await audit("user.role_changed", { userId: admin.id, target: id, req, meta: { from: target.role, to: input.role } });
  if (input.blocked !== undefined && input.blocked !== target.blocked) await audit(input.blocked ? "user.blocked" : "user.unblocked", { userId: admin.id, target: id, req });
  return ok(user);
});
