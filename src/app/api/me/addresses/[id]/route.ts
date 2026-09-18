import { db, TX } from "@/lib/db";
import { withApi, parseBody, ok, notFound } from "@/lib/apiError";
import { requireUser } from "@/lib/requireAuth";
import { addressSchema, uuid } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

/// Toujours filtré par userId : l'adresse d'un autre est introuvable.
export const PATCH = withApi<Ctx>(async (req, { params }) => {
  const me = await requireUser();
  const id = uuid.parse((await params).id);
  const input = await parseBody(req, addressSchema.partial());
  const a = await db.$transaction(async (tx) => {
    const cur = await tx.address.findFirst({ where: { id, userId: me.id }, select: { id: true } });
    if (!cur) throw notFound("Adresse");
    if (input.isDefault) await tx.address.updateMany({ where: { userId: me.id }, data: { isDefault: false } });
    return tx.address.update({ where: { id }, data: input });
  }, TX);
  return ok(a);
});

export const DELETE = withApi<Ctx>(async (_req, { params }) => {
  const me = await requireUser();
  const id = uuid.parse((await params).id);
  const r = await db.address.deleteMany({ where: { id, userId: me.id } });
  if (r.count === 0) throw notFound("Adresse");
  return ok({ ok: true });
});
