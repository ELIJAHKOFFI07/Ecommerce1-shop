import { db } from "@/lib/db";
import { pageUser } from "@/lib/pageAuth";
import { Card, Empty, PageTitle, Row, StatusPill, fmtDate, DAYS } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OfficePage() {
  const me = await pageUser("/espace/bureau");
  const user = await db.user.findUniqueOrThrow({ where: { id: me.id }, select: { officeId: true } });
  const office = user.officeId
    ? await db.office.findUnique({
        where: { id: user.officeId },
        select: {
          name: true, country: true, city: true, commune: true, neighborhood: true,
          manager: { select: { name: true, phone: true } },
          _count: { select: { members: true } },
          formations: { where: { status: { in: ["UPCOMING", "IN_PROGRESS"] } }, select: { id: true, type: true, title: true, dayOfWeek: true, date: true, timeSlot: true, location: true, notes: true, status: true }, orderBy: [{ date: "asc" }, { dayOfWeek: "asc" }] },
        },
      })
    : null;

  if (!office) {
    return (
      <>
        <PageTitle title="Mon bureau" />
        <Empty title="Vous n’êtes rattaché à aucun bureau" hint="L’administration vous affectera à un bureau régional." />
      </>
    );
  }

  return (
    <>
      <PageTitle title={office.name} subtitle={[office.neighborhood, office.commune, office.city, office.country].filter(Boolean).join(", ")} />
      <Card className="px-5 py-2">
        <Row label="Responsable" value={office.manager.name} />
        {office.manager.phone && (
          <Row
            label="Téléphone"
            value={
              <a href={`tel:${office.manager.phone}`} className="underline underline-offset-4">
                {office.manager.phone}
              </a>
            }
          />
        )}
        <Row label="Membres" value={office._count.members} />
      </Card>

      <h2 className="mb-3 mt-8 font-semibold">Formations et conférences</h2>
      {office.formations.length === 0 ? (
        <Empty title="Rien de prévu pour le moment" />
      ) : (
        <ul className="space-y-3">
          {office.formations.map((f) => (
            <li key={f.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{f.type === "TRAINING" ? "Formation" : "Conférence"}</p>
                    <p className="mt-1 text-lg font-semibold">{f.title}</p>
                  </div>
                  <StatusPill status={f.status} />
                </div>
                <p className="mt-2 text-muted-foreground">
                  {f.type === "TRAINING" ? `Chaque ${DAYS[f.dayOfWeek ?? 0]?.toLowerCase() ?? "semaine"}` : f.date ? fmtDate(f.date) : ""}
                  {f.timeSlot ? ` · ${f.timeSlot}` : ""}
                  {f.location ? ` · ${f.location}` : ""}
                </p>
                {f.notes && <p className="mt-2 text-sm">{f.notes}</p>}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
