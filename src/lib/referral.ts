import { db } from "@/lib/db";

/// Attache un filleul à un parrain si le code est valide et que le filleul
/// n'a pas déjà de parrain. Silencieux en cas de code invalide — appelée
/// automatiquement à l'inscription, une erreur ne doit pas bloquer la
/// création du compte.
export async function linkReferral(referredId: string, code: string) {
  const referrer = await db.user.findFirst({
    where: { referralCode: code.trim().toUpperCase(), id: { not: referredId } },
  });
  if (!referrer) return;

  const existing = await db.referral.findUnique({ where: { referredId } });
  if (existing) return;

  await db.$transaction([
    db.referral.create({
      data: { referrerId: referrer.id, referredId, code: code.trim().toUpperCase() },
    }),
    db.user.update({
      where: { id: referredId },
      data: { loyaltyPoints: { increment: 100 }, referredById: referrer.id },
    }),
  ]);
}
