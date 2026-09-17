import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { uuid } from "@/lib/validators";
import { Card, Empty, PageTitle, Row, StatusPill, fmtDate, DAYS } from "@/components/ui";
import { Table, td, ActionButton } from "@/components/admin";
import { FormationForm } from "../../formations/FormationForm";

export const dynamic = "force-dynamic";

export default async function OfficePage({ params }: { params: Promise<{ id: string }> }) {
  const { canEdit } = await pageModule("offices");
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const o = await db.office.findUnique({
    where: { id: parsed.data },
    select: {
      id: true, name: true, country: true, city: true, commune: true, neighborhood: true, createdAt: true,
      manager: { select: { id: true, name: true, memberNumber: true, phone: true, email: true } },
      members: { select: { id: true, name: true, memberNumber: true, phone: true, status: true }, orderBy: { name: "asc" } },
      formations: { select: { id: true, type: true, title: true, dayOfWeek: true, date: true, timeSlot: true, location: true, status: true }, orderBy: [{ status: "asc" }, { date: "asc" }] },
    },
  });
  if (!o) notFound();
  const STATUS: Record<string, string> = { MEMBRE: "Membre", INDEPENDANT: "Indépendant", CHEF_EQUIPE: "Chef d’équipe" };

  return (
    <div className="space-y-6">
      <Link href="/admin/bureaux" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Bureaux
      </Link>
      <PageTitle
        title={o.name}
        subtitle={[o.neighborhood, o.commune, o.city, o.country].filter(Boolean).join(", ")}
        action={canEdit && o.members.length === 0 ? <ActionButton path={`/api/admin/offices/${o.id}`} method="DELETE" variant="ghost" confirm="Supprimer ce bureau ?" redirect="/admin/bureaux">Supprimer</ActionButton> : undefined}
      />
      <Card className="px-5 py-2">
        <Row label="Responsable" value={<Link href={`/admin/membres/${o.manager.id}`} className="underline underline-offset-4">{o.manager.name} ({o.manager.memberNumber})</Link>} />
        <Row label="Contact" value={[o.manager.phone, o.manager.email].filter(Boolean).join(" · ")} />
        <Row label="Créé le" value={fmtDate(o.createdAt)} />
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold">Membres ({o.members.length})</h2>
          {o.members.length === 0 ? (
            <Empty title="Aucun membre rattaché" hint="Affectez des membres à ce bureau depuis leur fiche." />
          ) : (
            <Table head={["Nom", "Numéro", "Statut"]}>
              {o.members.map((m) => (
                <tr key={m.id}>
                  <td className={td}>
                    <Link href={`/admin/membres/${m.id}`} className="font-medium underline-offset-4 hover:underline">
                      {m.name}
                    </Link>
                    {m.phone && <div className="text-xs text-muted-foreground">{m.phone}</div>}
                  </td>
                  <td className={`${td} font-mono text-sm`}>{m.memberNumber}</td>
                  <td className={`${td} text-sm`}>{STATUS[m.status]}</td>
                </tr>
              ))}
            </Table>
          )}
        </section>
        <section className="space-y-4">
          <h2 className="font-semibold">Formations et conférences</h2>
          {canEdit && <FormationForm offices={[{ id: o.id, name: o.name }]} fixedOfficeId={o.id} />}
          {o.formations.length === 0 ? (
            <Empty title="Rien de prévu" />
          ) : (
            <Card className="divide-y divide-border">
              {o.formations.map((f) => (
                <div key={f.id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{f.type === "TRAINING" ? "Formation" : "Conférence"}</p>
                    <p className="font-medium">{f.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {f.type === "TRAINING" ? DAYS[f.dayOfWeek ?? 0] : f.date ? fmtDate(f.date) : ""}
                      {f.timeSlot && ` · ${f.timeSlot}`}
                      {f.location && ` · ${f.location}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <StatusPill status={f.status} />
                    {canEdit && (
                      <ActionButton path={`/api/admin/formations/${f.id}`} method="DELETE" variant="ghost" size="sm" confirm="Supprimer cette formation ?">
                        Supprimer
                      </ActionButton>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
