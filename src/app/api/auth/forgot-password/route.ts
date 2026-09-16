import { db } from "@/lib/db";
import { withApi, parseBody, ok } from "@/lib/apiError";
import { forgotPasswordSchema } from "@/lib/validators";
import { generateToken } from "@/lib/password";
import { consumeRateLimit, clientIp } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";
import { sendPasswordReset } from "@/lib/email";

/// Demande de réinitialisation. La réponse est IDENTIQUE que l'e-mail
/// existe ou non : on ne confirme jamais à un inconnu qu'un compte existe.
export const POST = withApi(async (req) => {
  const { email } = await parseBody(req, forgotPasswordSchema);
  await consumeRateLimit("forgotPassword", clientIp(req));
  await consumeRateLimit("forgotPassword", email);

  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true, blocked: true } });
  if (user && !user.blocked) {
    // Un seul jeton actif par compte : les précédents sont invalidés.
    await db.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
    const { token, hash } = generateToken();
    await db.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
    });
    const link = `${process.env.NEXT_PUBLIC_APP_URL}/nouveau-mot-de-passe?token=${token}`;
    await sendPasswordReset(email, user.name, link);
    await audit("auth.password_reset_requested", { userId: user.id, req });
  }
  return ok({ message: "Si un compte existe pour cet e-mail, un lien vient d'être envoyé." });
});
