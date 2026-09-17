import Link from "next/link";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { Empty, PageTitle, StatusPill, fmtDate, DAYS } from "@/components/ui";
import { Table, td, ActionButton } from "@/components/admin";
import { FormationForm } from "./FormationForm";
import { StatusSelect } from "./StatusSelect";

export const dynamic = "force-dynamic";

export default async function FormationsPage() {
  const { canEdit } = await pageModule("formations");
  const [list, offices] = await Promise.all([
    db.formation.findMany({ select: { id: true, type: true, title: true, dayOfWeek: true, date: true, timeSlot: true, location: true, status: true, office: { select: { id: true, name: true } } }, orderBy: [{ status: "asc" }, { date: "asc" }], take: 300 }),
    db.office.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <PageTitle title="Formations et conférences" />
      <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
        {canEdit && (offices.length ? <FormationForm offices={offices} /> : <Empty title="Créez d’abord un bureau" />)}
        <div>
          {list.length === 0 ? (
            <Empty title="Aucune formation" />
          ) : (
            <Table head={["Titre", "Bureau", "Quand", "Statut", ""]}>
              {list.map((f) => (
                <tr key={f.id}>
                  <td className={td}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{f.type === "TRAINING" ? "Formation" : "Conférence"}</p>
                    <p className="font-medium">{f.title}</p>
                  </td>
                  <td className={`${td} text-sm`}>
                    <Link href={`/admin/bureaux/${f.office.id}`} className="underline-offset-4 hover:underline">
                      {f.office.name}
                    </Link>
                  </td>
                  <td className={`${td} text-sm`}>
                    {f.type === "TRAINING" ? DAYS[f.dayOfWeek ?? 0] : f.date ? fmtDate(f.date) : ""}
                    {f.timeSlot && <div className="text-muted-foreground">{f.timeSlot}</div>}
                  </td>
                  <td className={td}>{canEdit ? <StatusSelect id={f.id} status={f.status} /> : <StatusPill status={f.status} />}</td>
                  <td className={`${td} text-right`}>
                    {canEdit && (
                      <ActionButton path={`/api/admin/formations/${f.id}`} method="DELETE" variant="ghost" size="sm" confirm="Supprimer ?">
                        Supprimer
                      </ActionButton>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </div>
    </>
  );
}
