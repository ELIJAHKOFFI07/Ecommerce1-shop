import { db, TX } from "@/lib/db";
import { withApi, parseBody, ok, ApiError } from "@/lib/apiError";
import { resetPasswordSchema } from "@/lib/validators";
import { hashPassword, hashToken, validatePasswordPolicy } from "@/lib/password";
import { consumeRateLimit, clientIp } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";

export const POST = withApi(async (req) => {
  await consumeRateLimit("resetPassword", clientIp(req));
  const { token, password } = await parseBody(req, resetPasswordSchema);
  const policy = validatePasswordPolicy(password);
  if (policy) throw new ApiError(400, policy);

  const tokenHash = hashToken(token);
  const passwordHash = await hashPassword(password);
  const userId = await db.$transaction(async (tx) => {
    const rec = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!rec || rec.usedAt || rec.expiresAt < new Date()) {
      throw new ApiError(400, "Ce lien est invalide ou a expiré. Refaites une demande.");
    }
    await tx.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
    await tx.user.update({
      where: { id: rec.userId },
      data: { passwordHash, passwordChangedAt: new Date(), failedLogins: 0, lockedUntil: null },
    });
    return rec.userId;
  }, TX);

  await audit("auth.password_reset", { userId, req });
  return ok({ message: "Mot de passe modifié. Vous pouvez vous connecter." });
});
