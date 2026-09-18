import { db } from "@/lib/db";
import { withApi, parseBody, ok, ApiError } from "@/lib/apiError";
import { registerSchema } from "@/lib/validators";
import { hashPassword, validatePasswordPolicy } from "@/lib/password";
import { consumeRateLimit, clientIp } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";
import { sendWelcome } from "@/lib/email";

/// Inscription client : nom, e-mail, mot de passe (téléphone facultatif).
export const POST = withApi(async (req) => {
  await consumeRateLimit("register", clientIp(req));
  const input = await parseBody(req, registerSchema);
  const policy = validatePasswordPolicy(input.password);
  if (policy) throw new ApiError(400, policy);
  const exists = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (exists) throw new ApiError(409, "Un compte existe déjà avec cet e-mail. Connectez-vous.");
  const user = await db.user.create({
    data: { name: input.name, email: input.email, phone: input.phone, passwordHash: await hashPassword(input.password), passwordChangedAt: new Date() },
    select: { id: true, name: true, email: true },
  });
  await audit("auth.register", { userId: user.id, req });
  void sendWelcome(user.email, user.name);
  return ok({ ok: true }, 201);
});
