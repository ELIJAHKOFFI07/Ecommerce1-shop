import { db } from "@/lib/db";
import { withApi, parseBody, ok } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { formationSchema } from "@/lib/validators";

export const formationSelect = {
  id: true, type: true, title: true, dayOfWeek: true, date: true, timeSlot: true, location: true, notes: true, status: true, createdAt: true,
  office: { select: { id: true, name: true } },
} as const;

export const GET = withApi(async () => {
  await requirePermission("formations", "view");
  return ok(await db.formation.findMany({ select: formationSelect, orderBy: [{ status: "asc" }, { date: "asc" }], take: 300 }));
});

export const POST = withApi(async (req) => {
  await requirePermission("formations", "edit");
  const input = await parseBody(req, formationSchema);
  const f = await db.formation.create({ data: input, select: formationSelect });
  return ok(f, 201);
});
