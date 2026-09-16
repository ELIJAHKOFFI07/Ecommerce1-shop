import { db } from "@/lib/db";
import { withApi, ok, notFound, ApiError } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { uuid } from "@/lib/validators";
import { hashPassword, generateTempPassword } from "@/lib/password";
import { audit } from "@/lib/audit";
import { sendWelcome } from "@/lib/email";

/// Réinitialisation par l'admin : nouveau mot de passe temporaire envoyé
/// par e-mail au membre. Le mot de passe n'est jamais renvoyé à l'admin —
/// il ne doit pas transiter par un écran ni un journal.
export const POST = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requirePermission("users", "edit");
  const id = uuid.parse((await params).id);
  const user = await db.user.findUnique({ where: { id }, select: { email: true, name: true, memberNumber: true, role: true } });
  if (!user) throw notFound("Membre");
  if (admin.role !== "SUPER_ADMIN" && user.role !== "CLIENT") throw new ApiError(403, "Seul le super administrateur réinitialise un compte de l'équipe.");
  const temp = generateTempPassword();
  await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(temp), failedLogins: 0, lockedUntil: null, passwordChangedAt: null } });
  await audit("auth.password_reset", { userId: admin.id, target: id, req, meta: { by: "admin" } });
  await sendWelcome(user.email, user.name, user.memberNumber, temp);
  return ok({ message: `Un mot de passe temporaire a été envoyé à ${user.email}.` });
});
