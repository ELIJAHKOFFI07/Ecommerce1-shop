import { db } from "@/lib/db";
import { withApi, parseBody, ok } from "@/lib/apiError";
import { requireUser } from "@/lib/requireAuth";
import { profileSchema } from "@/lib/validators";

export const GET = withApi(async () => {
  const me = await requireUser();
  const user = await db.user.findUniqueOrThrow({
    where: { id: me.id },
    select: { id: true, name: true, email: true, image: true, phone: true, role: true, createdAt: true, addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }, _count: { select: { orders: true } } },
  });
  return ok(user);
});

/// Rôle, e-mail et blocage ne sont pas dans le schéma : impossibles à
/// modifier ici même en forgeant la requête.
export const PATCH = withApi(async (req) => {
  const me = await requireUser();
  const input = await parseBody(req, profileSchema);
  const user = await db.user.update({ where: { id: me.id }, data: input, select: { name: true, phone: true, image: true } });
  return ok(user);
});
