import { db, TX } from "@/lib/db";
import { withApi, parseBody, ok, notFound, ApiError } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { officeSchema, uuid } from "@/lib/validators";
import { officeSelect } from "../route";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApi<Ctx>(async (_req, { params }) => {
  await requirePermission("offices", "view");
  const id = uuid.parse((await params).id);
  const o = await db.office.findUnique({
    where: { id },
    select: {
      ...officeSelect,
      members: { select: { id: true, name: true, memberNumber: true, phone: true, status: true }, orderBy: { name: "asc" } },
      formations: { select: { id: true, type: true, title: true, dayOfWeek: true, date: true, timeSlot: true, location: true, status: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!o) throw notFound("Bureau");
  return ok(o);
});

export const PATCH = withApi<Ctx>(async (req, { params }) => {
  await requirePermission("offices", "edit");
  const id = uuid.parse((await params).id);
  const input = await parseBody(req, officeSchema.partial());
  const o = await db.$transaction(async (tx) => {
    if (input.managerId) {
      const clash = await tx.office.findFirst({ where: { managerId: input.managerId, NOT: { id } }, select: { id: true } });
      if (clash) throw new ApiError(400, "Ce membre est déjà responsable d'un autre bureau.");
      await tx.user.update({ where: { id: input.managerId }, data: { officeId: id } });
    }
    return tx.office.update({ where: { id }, data: input, select: officeSelect });
  }, TX);
  return ok(o);
});

export const DELETE = withApi<Ctx>(async (_req, { params }) => {
  await requirePermission("offices", "edit");
  const id = uuid.parse((await params).id);
  const members = await db.user.count({ where: { officeId: id } });
  if (members > 0) throw new ApiError(400, `${members} membre(s) sont rattachés à ce bureau. Réaffectez-les d'abord.`);
  await db.office.delete({ where: { id } });
  return ok({ ok: true });
});
