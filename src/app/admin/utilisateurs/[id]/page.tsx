import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { MODULES } from "@/lib/requireAuth";
import { uuid } from "@/lib/validators";
import { Alert, Card, Money, PageTitle, Row, StatusPill, fmtDate, Empty } from "@/components/ui";
import { Table, td } from "@/components/admin";
import { ROLE_LABEL } from "../labels";
import { UserEditor } from "./UserEditor";

export const dynamic = "force-dynamic";

/// Fiche complète : informations, commandes, adresses — et le bloc de
/// gestion à droite (compte, rôle, accès, sécurité).
export default async function UserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cree?: string }> }) {
  const { user: admin, canEdit } = await pageModule("users");
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const { cree } = await searchParams;
  const u = await db.user.findUnique({
    where: { id: parsed.data },
    select: {
      id: true, name: true, email: true, phone: true, role: true, blocked: true, createdAt: true, lockedUntil: true, failedLogins: true, image: true,
      permissions: { select: { canView: true, canEdit: true, module: { select: { slug: true } } } },
      orders: { select: { id: true, orderNumber: true, status: true, paymentStatus: true, total: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 30 },
      addresses: { select: { id: true, label: true, fullName: true, phone: true, city: true, commune: true, details: true, isDefault: true }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
      _count: { select: { orders: true } },
    },
  });
  if (!u) notFound();
  const isSelf = u.id === admin.id;
  const isSuper = admin.role === "SUPER_ADMIN";
  const editable = canEdit && (isSuper || u.role === "CLIENT");
  const spent = u.orders.filter((o) => o.status === "DELIVERED").reduce((n, o) => n + Number(o.total), 0);

  return (
    <div className="space-y-6">
      {cree && <Alert tone="success">Compte créé. Un mot de passe temporaire a été envoyé à {u.email}.</Alert>}
      <PageTitle title={u.name} subtitle={`${ROLE_LABEL[u.role]}${u.blocked ? " · BLOQUÉ" : ""}`} />
      {u.lockedUntil && u.lockedUntil > new Date() && <Alert tone="error">Compte verrouillé jusqu’à {fmtDate(u.lockedUntil, true)} après {u.failedLogins} échecs de connexion.</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Total acheté (livré)" value={<Money value={spent} className="text-3xl" />} />
        <Kpi label="Commandes" value={u._count.orders} />
        <Kpi label="Client depuis" value={<span className="text-xl">{fmtDate(u.createdAt)}</span>} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-8">
          <Card className="px-5 py-2">
            <Row label="E-mail" value={u.email} />
            <Row label="Téléphone" value={u.phone ?? "—"} />
          </Card>

          <section>
            <h2 className="mb-3 font-semibold">Commandes</h2>
            {u.orders.length === 0 ? (
              <Empty title="Aucune commande" />
            ) : (
              <Table head={["Commande", "Date", "Statut", "Paiement", "Total"]}>
                {u.orders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted">
                    <td className={td}><Link href={`/admin/commandes/${o.id}`} className="font-semibold underline-offset-4 hover:underline">{o.orderNumber}</Link></td>
                    <td className={`${td} whitespace-nowrap text-sm`}>{fmtDate(o.createdAt)}</td>
                    <td className={td}><StatusPill status={o.status} /></td>
                    <td className={td}><StatusPill status={o.paymentStatus} /></td>
                    <td className={td}><Money value={o.total} /></td>
                  </tr>
                ))}
              </Table>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Adresses</h2>
            {u.addresses.length === 0 ? (
              <Empty title="Aucune adresse enregistrée" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {u.addresses.map((a) => (
                  <Card key={a.id} className="p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{a.label}{a.isDefault ? " · par défaut" : ""}</p>
                    <p className="mt-1 font-semibold">{a.fullName} · {a.phone}</p>
                    <p className="text-sm text-muted-foreground">{a.details}, {a.commune ? `${a.commune}, ` : ""}{a.city}</p>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>

        {editable ? (
          <UserEditor
            user={{ id: u.id, name: u.name, phone: u.phone ?? "", role: u.role, blocked: u.blocked }}
            isSelf={isSelf}
            isSuperAdmin={isSuper}
            modules={MODULES}
            permissions={u.permissions.map((p) => ({ slug: p.module.slug, canView: p.canView, canEdit: p.canEdit }))}
            canDelete={!isSelf && u._count.orders === 0}
          />
        ) : (
          <Card className="h-fit p-5 text-sm text-muted-foreground">Lecture seule.</Card>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="font-display mt-1 text-3xl font-semibold tabular">{value}</div>
    </Card>
  );
}
