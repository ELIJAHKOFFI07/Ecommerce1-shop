import { db } from "@/lib/db";
import { withApi, parseBody, ok, ApiError } from "@/lib/apiError";
import { requireUser } from "@/lib/requireAuth";
import { profileSchema } from "@/lib/validators";

export const GET = withApi(async () => {
  const me = await requireUser();
  const user = await db.user.findUniqueOrThrow({
    where: { id: me.id },
    select: {
      id: true, memberNumber: true, name: true, pseudo: true, email: true, image: true, phone: true, city: true,
      role: true, status: true, createdAt: true,
      sponsor: { select: { name: true, memberNumber: true } },
      office: { select: { id: true, name: true, city: true } },
      wallet: { select: { balance: true } },
      _count: { select: { referrals: true } },
    },
  });
  return ok(user);
});

/// Le membre modifie uniquement ses champs « libres ». Rôle, statut,
/// bureau, numéro de membre et e-mail ne sont pas dans le schéma : même en
/// forgeant la requête, ils ne peuvent pas être modifiés ici.
export const PATCH = withApi(async (req) => {
  const me = await requireUser();
  const input = await parseBody(req, profileSchema);
  if (input.pseudo) {
    const taken = await db.user.findFirst({ where: { pseudo: input.pseudo, NOT: { id: me.id } }, select: { id: true } });
    if (taken) throw new ApiError(409, "Ce pseudo est déjà pris.");
  }
  const user = await db.user.update({
    where: { id: me.id },
    data: input,
    select: { name: true, pseudo: true, phone: true, city: true, image: true },
  });
  return ok(user);
});
