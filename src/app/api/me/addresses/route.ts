import { db, TX } from "@/lib/db";
import { withApi, parseBody, ok } from "@/lib/apiError";
import { requireUser } from "@/lib/requireAuth";
import { addressSchema } from "@/lib/validators";

export const GET = withApi(async () => {
  const me = await requireUser();
  return ok(await db.address.findMany({ where: { userId: me.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }));
});

export const POST = withApi(async (req) => {
  const me = await requireUser();
  const input = await parseBody(req, addressSchema);
  const a = await db.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId: me.id } });
    const isDefault = input.isDefault || count === 0;
    if (isDefault) await tx.address.updateMany({ where: { userId: me.id }, data: { isDefault: false } });
    return tx.address.create({ data: { ...input, isDefault, userId: me.id } });
  }, TX);
  return ok(a, 201);
});
