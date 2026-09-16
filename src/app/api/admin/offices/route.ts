import { db, TX } from "@/lib/db";
import { withApi, parseBody, ok, ApiError } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { officeSchema } from "@/lib/validators";

export const officeSelect = {
  id: true, name: true, country: true, city: true, commune: true, neighborhood: true, createdAt: true,
  manager: { select: { id: true, name: true, memberNumber: true, phone: true } },
  _count: { select: { members: true, formations: true } },
} as const;

export const GET = withApi(async () => {
  await requirePermission("offices", "view");
  return ok(await db.office.findMany({ select: officeSelect, orderBy: { name: "asc" } }));
});

export const POST = withApi(async (req) => {
  await requirePermission("offices", "edit");
  const input = await parseBody(req, officeSchema);
  const office = await db.$transaction(async (tx) => {
    const manager = await tx.user.findUnique({ where: { id: input.managerId }, select: { id: true, managedOffice: { select: { id: true } } } });
    if (!manager) throw new ApiError(404, "Responsable introuvable.");
    if (manager.managedOffice) throw new ApiError(400, "Ce membre est déjà responsable d'un autre bureau.");
    if (await tx.office.findUnique({ where: { name: input.name }, select: { id: true } })) throw new ApiError(409, "Un bureau porte déjà ce nom.");
    const o = await tx.office.create({ data: input, select: officeSelect });
    // Le responsable est membre de son propre bureau.
    await tx.user.update({ where: { id: input.managerId }, data: { officeId: o.id } });
    return o;
  }, TX);
  return ok(office, 201);
});
