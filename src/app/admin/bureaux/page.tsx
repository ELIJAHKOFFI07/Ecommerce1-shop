import Link from "next/link";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { Empty, PageTitle } from "@/components/ui";
import { Table, td } from "@/components/admin";
import { OfficeForm } from "./OfficeForm";

export const dynamic = "force-dynamic";

export default async function OfficesPage() {
  const { canEdit } = await pageModule("offices");
  const offices = await db.office.findMany({
    select: { id: true, name: true, city: true, commune: true, manager: { select: { name: true, phone: true } }, _count: { select: { members: true, formations: true } } },
    orderBy: { name: "asc" },
  });
  return (
    <>
      <PageTitle title="Bureaux" subtitle="Un bureau régional a un responsable et des membres." />
      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
        {canEdit && <OfficeForm />}
        <div>
          {offices.length === 0 ? (
            <Empty title="Aucun bureau" />
          ) : (
            <Table head={["Bureau", "Responsable", "Membres", "Formations"]}>
              {offices.map((o) => (
                <tr key={o.id} className="hover:bg-muted">
                  <td className={td}>
                    <Link href={`/admin/bureaux/${o.id}`} className="font-semibold underline-offset-4 hover:underline">
                      {o.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{[o.commune, o.city].filter(Boolean).join(", ")}</div>
                  </td>
                  <td className={`${td} text-sm`}>
                    {o.manager.name}
                    {o.manager.phone && <div className="text-muted-foreground">{o.manager.phone}</div>}
                  </td>
                  <td className={`${td} tabular`}>{o._count.members}</td>
                  <td className={`${td} tabular`}>{o._count.formations}</td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </div>
    </>
  );
}
