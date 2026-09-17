import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { MODULES } from "@/lib/requireAuth";
import { uuid } from "@/lib/validators";
import { Alert, Card, Money, PageTitle, Row, fmtDate, ButtonLink } from "@/components/ui";
import { ROLE_LABEL, STATUS_LABEL } from "../page";
import { MemberEditor } from "./MemberEditor";

export const dynamic = "force-dynamic";

export default async function MemberPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cree?: string }> }) {
  const { user: admin, canEdit } = await pageModule("users");
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const { cree } = await searchParams;
  const [u, offices] = await Promise.all([
    db.user.findUnique({
      where: { id: parsed.data },
      select: {
        id: true, memberNumber: true, name: true, pseudo: true, email: true, phone: true, city: true, role: true, status: true, blocked: true, createdAt: true, lockedUntil: true, failedLogins: true,
        sponsor: { select: { id: true, name: true, memberNumber: true } },
        office: { select: { id: true, name: true } },
        wallet: { select: { balance: true } },
        referrals: { select: { id: true, name: true, memberNumber: true }, take: 50, orderBy: { createdAt: "desc" } },
        stocks: { where: { quantity: { gt: 0 } }, select: { quantity: true, product: { select: { title: true } } } },
        permissions: { select: { canView: true, canEdit: true, module: { select: { slug: true } } } },
        _count: { select: { orders: true, deliveries: true } },
      },
    }),
    db.office.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!u) notFound();
  const isSelf = u.id === admin.id;
  const isSuper = admin.role === "SUPER_ADMIN";
  const editable = canEdit && (isSuper || u.role === "CLIENT");

  return (
    <div className="space-y-6">
      <Link href="/admin/membres" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Membres
      </Link>
      {cree && <Alert tone="success">Compte créé. Un mot de passe temporaire a été envoyé à {u.email}.</Alert>}
      <PageTitle
        title={u.name}
        subtitle={`${u.memberNumber} · ${ROLE_LABEL[u.role]} · ${STATUS_LABEL[u.status]}${u.blocked ? " · BLOQUÉ" : ""}`}
        action={<ButtonLink href={`/admin/portefeuilles/${u.id}`} variant="secondary">Portefeuille</ButtonLink>}
      />
      {u.lockedUntil && u.lockedUntil > new Date() && <Alert tone="error">Compte verrouillé jusqu’à {fmtDate(u.lockedUntil, true)} après {u.failedLogins} échecs de connexion.</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <Card className="px-5 py-2">
            <Row label="E-mail" value={u.email} />
            <Row label="Téléphone" value={u.phone ?? "—"} />
            <Row label="Ville" value={u.city ?? "—"} />
            <Row label="Bureau" value={u.office ? <Link href={`/admin/bureaux/${u.office.id}`} className="underline underline-offset-4">{u.office.name}</Link> : "—"} />
            <Row label="Parrain" value={u.sponsor ? <Link href={`/admin/membres/${u.sponsor.id}`} className="underline underline-offset-4">{u.sponsor.name} ({u.sponsor.memberNumber})</Link> : "—"} />
            <Row label="Solde" value={<Money value={u.wallet?.balance ?? 0} />} />
            <Row label="Commandes / retraits" value={`${u._count.orders} / ${u._count.deliveries}`} />
            <Row label="Inscrit le" value={fmtDate(u.createdAt)} />
          </Card>

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
                <Row key={r.id} label={<Link href={`/admin/membres/${r.id}`} className="underline underline-offset-4">{r.name}</Link> as never} value={r.memberNumber} />
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
          />
        ) : (
          <Card className="h-fit p-5 text-sm text-muted-foreground">Lecture seule.</Card>
        )}
      </div>
    </div>
  );
}
