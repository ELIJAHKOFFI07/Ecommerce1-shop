import { db } from "@/lib/db";
import { withApi, parseBody, ok } from "@/lib/apiError";
import { requireUser } from "@/lib/requireAuth";
import { walletSearchSchema } from "@/lib/validators";
import { consumeRateLimit } from "@/lib/rateLimit";

/// Recherche d'un destinataire de transfert par numéro de membre, e-mail
/// exact ou téléphone exact. Pas de recherche partielle : on ne veut pas
/// qu'un membre puisse parcourir l'annuaire. Ne renvoie que nom + numéro.
export const POST = withApi(async (req) => {
  const me = await requireUser();
  await consumeRateLimit("api", `walletsearch:${me.id}`);
  const { query } = await parseBody(req, walletSearchSchema);
  const q = query.trim();
  const found = await db.user.findFirst({
    where: {
      blocked: false,
      NOT: { id: me.id },
      OR: [{ memberNumber: q.toUpperCase() }, { email: q.toLowerCase() }, { phone: q.replace(/\s+/g, "") }],
    },
    select: { memberNumber: true, name: true, image: true },
  });
  return ok(found ?? null);
});
