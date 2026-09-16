import { db, TX } from "@/lib/db";
import { withApi, parseBody, ok, ApiError } from "@/lib/apiError";
import { registerSchema } from "@/lib/validators";
import { hashPassword, validatePasswordPolicy } from "@/lib/password";
import { consumeRateLimit, clientIp } from "@/lib/rateLimit";
import { nextMemberNumber } from "@/lib/ids";
import { audit } from "@/lib/audit";
import { sendWelcome } from "@/lib/email";

/// Inscription par formulaire. Le numéro de membre est attribué ici ; le
/// parrain est optionnel et vérifié (un numéro inconnu est refusé plutôt
/// qu'ignoré silencieusement — le membre saurait sinon trop tard qu'il
/// n'est rattaché à personne).
export const POST = withApi(async (req) => {
  await consumeRateLimit("register", clientIp(req));
  const input = await parseBody(req, registerSchema);

  const policy = validatePasswordPolicy(input.password);
  if (policy) throw new ApiError(400, policy);

  let sponsorId: string | null = null;
  if (input.sponsorMemberNumber) {
    const sponsor = await db.user.findUnique({
      where: { memberNumber: input.sponsorMemberNumber.toUpperCase() },
      select: { id: true, blocked: true },
    });
    if (!sponsor || sponsor.blocked) throw new ApiError(400, "Numéro de parrain introuvable.");
    sponsorId = sponsor.id;
  }

  const passwordHash = await hashPassword(input.password);

  const user = await db.$transaction(async (tx) => {
    const exists = await tx.user.findUnique({ where: { email: input.email }, select: { id: true } });
    // À l'inscription, dire « déjà utilisé » est nécessaire à l'utilisateur
    // légitime ; la limitation de débit borne l'énumération.
    if (exists) throw new ApiError(409, "Un compte existe déjà avec cet e-mail. Connectez-vous.");
    const memberNumber = await nextMemberNumber(tx);
    return tx.user.create({
      data: {
        memberNumber,
        name: input.name,
        email: input.email,
        phone: input.phone,
        city: input.city,
        passwordHash,
        sponsorId,
        passwordChangedAt: new Date(),
        wallet: { create: {} },
      },
      select: { id: true, memberNumber: true, name: true, email: true },
    });
  }, TX);

  await audit("auth.register", { userId: user.id, req, meta: { sponsorId } });
  void sendWelcome(user.email, user.name, user.memberNumber);
  return ok({ memberNumber: user.memberNumber }, 201);
});
