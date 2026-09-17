import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { MODULES } from "@/lib/requireAuth";
import { uuid } from "@/lib/validators";
import { Alert, Card, Money, PageTitle, Row, StatusPill, fmtDate, ButtonLink, Empty } from "@/components/ui";
import { Table, td } from "@/components/admin";
import { ROLE_LABEL, STATUS_LABEL } from "../page";
import { MemberEditor } from "./MemberEditor";

export const dynamic = "force-dynamic";

/// Fiche client complète : informations, solde, commandes et reçus,
/// retraits, stock personnel, filleuls — et le bloc de gestion à droite.
export default async function MemberPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cree?: string }> }) {
  const { user: admin, canEdit } = await pageModule("users");
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const { cree } = await searchParams;
  const [u, offices] = await Promise.all([
    db.user.findUnique({
      where: { id: parsed.data },
      select: {
        id: true, memberNumber: true, name: true, pseudo: true, email: true, phone: true, city: true, role: true, status: true, blocked: true, createdAt: true, lockedUntil: true, failedLogins: true, image: true,
        sponsor: { select: { id: true, name: true, memberNumber: true } },
        office: { select: { id: true, name: true } },
        wallet: { select: { balance: true } },
        referrals: { select: { id: true, name: true, memberNumber: true, createdAt: true }, take: 50, orderBy: { createdAt: "desc" } },
        stocks: { where: { quantity: { gt: 0 } }, select: { quantity: true, product: { select: { title: true } } } },
        permissions: { select: { canView: true, canEdit: true, module: { select: { slug: true } } } },
        orders: { select: { id: true, orderNumber: true, status: true, total: true, claimReference: true, receiptUrl: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 30 },
        deliveries: { select: { id: true, status: true, tva: true, tvaPaid: true, createdAt: true, items: { select: { quantity: true, product: { select: { title: true } } } } }, orderBy: { createdAt: "desc" }, take: 30 },
        walletTransactions: { select: { id: true, amount: true, type: true, description: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 10 },
        _count: { select: { orders: true, deliveries: true, referrals: true, walletTransactions: true } },
      },
    }),
    db.office.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!u) notFound();
  const isSelf = u.id === admin.id;
  const isSuper = admin.role === "SUPER_ADMIN";
  const editable = canEdit && (isSuper || u.role === "CLIENT");
  const spent = u.orders.filter((o) => ["VALIDATED", "DELIVERED"].includes(o.status)).reduce((n, o) => n + Number(o.total), 0);

  return (
    <div className="space-y-6">
      <Link href="/admin/membres" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Clients
      </Link>
      {cree && <Alert tone="success">Compte créé. Un mot de passe temporaire a été envoyé à {u.email}.</Alert>}
      <PageTitle
        title={u.name}
        subtitle={`${u.memberNumber} · ${ROLE_LABEL[u.role]} · ${STATUS_LABEL[u.status]}${u.blocked ? " · BLOQUÉ" : ""}`}
        action={<ButtonLink href={`/admin/portefeuilles/${u.id}`} variant="secondary">Portefeuille</ButtonLink>}
      />
      {u.lockedUntil && u.lockedUntil > new Date() && <Alert tone="error">Compte verrouillé jusqu’à {fmtDate(u.lockedUntil, true)} après {u.failedLogins} échecs de connexion.</Alert>}

      {/* Chiffres clés */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi label="Solde" value={<Money value={u.wallet?.balance ?? 0} className="text-3xl" />} />
        <Kpi label="Total acheté (validé)" value={<Money value={spent} className="text-3xl" />} />
        <Kpi label="Commandes" value={u._count.orders} />
        <Kpi label="Retraits" value={u._count.deliveries} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-8">
          <Card className="px-5 py-2">
            <Row label="E-mail" value={u.email} />
            <Row label="Téléphone" value={u.phone ?? "—"} />
            <Row label="Pseudo" value={u.pseudo ?? "—"} />
            <Row label="Ville" value={u.city ?? "—"} />
            <Row label="Bureau" value={u.office ? <Link href={`/admin/bureaux/${u.office.id}`} className="underline underline-offset-4">{u.office.name}</Link> : "—"} />
            <Row label="Parrain" value={u.sponsor ? <Link href={`/admin/membres/${u.sponsor.id}`} className="underline underline-offset-4">{u.sponsor.name} ({u.sponsor.memberNumber})</Link> : "—"} />
            <Row label="Inscrit le" value={fmtDate(u.createdAt)} />
          </Card>

          <section>
            <h2 className="mb-3 font-semibold">Commandes et reçus</h2>
            {u.orders.length === 0 ? (
              <Empty title="Aucune commande" />
            ) : (
              <Table head={["Commande", "Claim Reference", "Date", "Statut", "Total", "Pièce"]}>
                {u.orders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted">
                    <td className={td}>
                      <Link href={`/admin/commandes/${o.id}`} className="font-semibold underline-offset-4 hover:underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className={`${td} font-mono text-sm`}>{o.claimReference}</td>
                    <td className={`${td} whitespace-nowrap text-sm`}>{fmtDate(o.createdAt)}</td>
                    <td className={td}><StatusPill status={o.status} /></td>
                    <td className={td}><Money value={o.total} /></td>
                    <td className={td}>
                      {o.receiptUrl ? (
                        <a href={o.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline">
                          <FileText className="h-4 w-4" aria-hidden /> Reçu
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Retraits</h2>
            {u.deliveries.length === 0 ? (
              <Empty title="Aucun retrait" />
            ) : (
              <Table head={["Produits", "Date", "TVA", "Statut"]}>
                {u.deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-muted">
                    <td className={`${td} text-sm`}>
                      <Link href={`/admin/retraits/${d.id}`} className="font-medium underline-offset-4 hover:underline">
                        {d.items.map((i) => `${i.quantity} × ${i.product.title}`).join(", ")}
                      </Link>
                    </td>
                    <td className={`${td} whitespace-nowrap text-sm`}>{fmtDate(d.createdAt)}</td>
                    <td className={`${td} text-sm`}>{d.tva && Number(d.tva) > 0 ? <><Money value={d.tva} className="text-sm" /> {d.tvaPaid ? "payée" : "à payer"}</> : "—"}</td>
                    <td className={td}><StatusPill status={d.status} /></td>
                  </tr>
                ))}
              </Table>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Derniers mouvements du solde</h2>
            {u.walletTransactions.length === 0 ? (
              <Empty title="Aucun mouvement" />
            ) : (
              <Card className="divide-y divide-border">
                {u.walletTransactions.map((t) => {
                  const amt = Number(t.amount);
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{t.description ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(t.createdAt, true)}</p>
                      </div>
                      <Money value={Math.abs(amt)} className={amt < 0 ? "text-destructive" : "text-success"} />
                    </div>
                  );
                })}
                <Link href={`/admin/portefeuilles/${u.id}`} className="block px-5 py-3 text-center text-sm font-semibold underline-offset-4 hover:underline">
                  Tout l’historique et créditer
                </Link>
              </Card>
            )}
          </section>

          {u.stocks.length > 0 && (
            <Card className="px-5 py-2">
              <p className="pt-2 text-sm font-semibold">Stock personnel</p>
              {u.stocks.map((s, i) => (
                <Row key={i} label={s.product.title} value={s.quantity} />
              ))}
            </Card>
          )}

          {u.referrals.length > 0 && (
            <Card className="px-5 py-2">
              <p className="pt-2 text-sm font-semibold">Filleuls ({u.referrals.length})</p>
              {u.referrals.map((r) => (
                <Row key={r.id} label={r.memberNumber} value={<Link href={`/admin/membres/${r.id}`} className="underline underline-offset-4">{r.name}</Link>} />
              ))}
            </Card>
          )}
        </div>

        {editable ? (
          <MemberEditor
            user={{ id: u.id, name: u.name, phone: u.phone ?? "", city: u.city ?? "", role: u.role, status: u.status, blocked: u.blocked, officeId: u.office?.id ?? "" }}
            offices={offices}
            isSelf={isSelf}
            isSuperAdmin={isSuper}
            modules={MODULES}
            permissions={u.permissions.map((p) => ({ slug: p.module.slug, canView: p.canView, canEdit: p.canEdit }))}
            canDelete={!isSelf && !(u._count.orders || u._count.deliveries || u._count.referrals || u._count.walletTransactions || u.stocks.length)}
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
