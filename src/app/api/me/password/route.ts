import { db } from "@/lib/db";
import { withApi, parseBody, ok, ApiError } from "@/lib/apiError";
import { requireUser } from "@/lib/requireAuth";
import { changePasswordSchema } from "@/lib/validators";
import { hashPassword, verifyPassword, validatePasswordPolicy } from "@/lib/password";
import { audit } from "@/lib/audit";

export const POST = withApi(async (req) => {
  const me = await requireUser();
  const { currentPassword, newPassword } = await parseBody(req, changePasswordSchema);
  const policy = validatePasswordPolicy(newPassword);
  if (policy) throw new ApiError(400, policy);
  const user = await db.user.findUniqueOrThrow({ where: { id: me.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new ApiError(400, "Mot de passe actuel incorrect.");
  }
  if (currentPassword === newPassword) throw new ApiError(400, "Choisissez un mot de passe différent de l'actuel.");
  await db.user.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(newPassword), passwordChangedAt: new Date() },
  });
  await audit("auth.password_changed", { userId: me.id, req });
  return ok({ message: "Mot de passe modifié." });
});
