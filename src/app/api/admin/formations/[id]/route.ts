import { db } from "@/lib/db";
import { withApi, parseBody, ok } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { formationSchema, uuid } from "@/lib/validators";
import { formationSelect } from "../route";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApi<Ctx>(async (req, { params }) => {
  await requirePermission("formations", "edit");
  const id = uuid.parse((await params).id);
  const input = await parseBody(req, formationSchema.partial());
  const f = await db.formation.update({ where: { id }, data: input, select: formationSelect });
  return ok(f);
});

export const DELETE = withApi<Ctx>(async (_req, { params }) => {
  await requirePermission("formations", "edit");
  const id = uuid.parse((await params).id);
  await db.formation.delete({ where: { id } });
  return ok({ ok: true });
});
