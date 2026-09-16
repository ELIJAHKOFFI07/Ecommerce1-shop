import { db } from "@/lib/db";
import { withApi, ok } from "@/lib/apiError";
import { requireUser } from "@/lib/requireAuth";

/// Mon bureau et ses formations à venir. Un membre sans bureau reçoit null.
export const GET = withApi(async () => {
  const me = await requireUser();
  const user = await db.user.findUniqueOrThrow({ where: { id: me.id }, select: { officeId: true } });
  if (!user.officeId) return ok(null);
  const office = await db.office.findUnique({
    where: { id: user.officeId },
    select: {
      id: true, name: true, country: true, city: true, commune: true, neighborhood: true,
      manager: { select: { name: true, phone: true } },
      _count: { select: { members: true } },
      formations: {
        where: { status: { in: ["UPCOMING", "IN_PROGRESS"] } },
        select: { id: true, type: true, title: true, dayOfWeek: true, date: true, timeSlot: true, location: true, notes: true, status: true },
        orderBy: [{ date: "asc" }, { dayOfWeek: "asc" }],
      },
    },
  });
  return ok(office);
});
