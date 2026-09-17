import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { uuid } from "@/lib/validators";
import { Card, Money, PageTitle, Row, StatusPill, fmtDate } from "@/components/ui";
import { OrderActions } from "./OrderActions";

export const dynamic = "force-dynamic";

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { canEdit } = await pageModule("orders");
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const o = await db.order.findUnique({
    where: { id: parsed.data },
    select: {
      id: true, orderNumber: true, status: true, subTotal: true, taxTotal: true, total: true, claimReference: true, salesNo: true, receiptUrl: true, note: true, rejectionReason: true, createdAt: true, validatedAt: true,
      user: { select: { id: true, name: true, memberNumber: true, phone: true, email: true } },
      items: { select: { id: true, quantity: true, unitPrice: true, totalPrice: true, product: { select: { id: true, title: true, stockVirtuel: true } } } },
    },
  });
  if (!o) notFound();
  const shortage = o.items.filter((it) => it.product.stockVirtuel < it.quantity);

  return (
    <div className="space-y-6">
      <PageTitle title={o.orderNumber} subtitle={`Envoyée le ${fmtDate(o.createdAt, true)}`} action={<div className="flex items-center gap-3">{["VALIDATED", "DELIVERED"].includes(o.status) && <Link href={`/espace/commandes/${o.id}/recu`} className="press inline-flex h-10 items-center rounded-md border border-border-strong bg-card px-4 text-sm font-semibold hover:bg-muted">Reçu</Link>}<StatusPill status={o.status} /></div>} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="divide-y divide-border px-5">
            {o.items.map((it) => (
              <div key={it.id} className="flex items-center gap-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/produits/${it.product.id}`} className="font-medium underline-offset-4 hover:underline">
                    {it.product.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {it.quantity} × <Money value={it.unitPrice} className="text-sm" /> · stock virtuel : <span className={it.product.stockVirtuel < it.quantity ? "font-semibold text-destructive" : ""}>{it.product.stockVirtuel}</span>
                  </p>
                </div>
                <Money value={it.totalPrice} className="text-lg" />
              </div>
            ))}
            <div className="py-3">
              <Row label="Sous-total" value={<Money value={o.subTotal} />} />
              <Row label="TVA" value={<Money value={o.taxTotal} />} />
              <Row label="Total" value={<Money value={o.total} className="text-2xl" />} />
            </div>
          </Card>

          <Card className="px-5 py-2">
            <Row label="Claim Reference" value={<span className="font-mono">{o.claimReference}</span>} />
            {o.salesNo && <Row label="Sales No" value={<span className="font-mono">{o.salesNo}</span>} />}
            <Row
              label="Reçu joint"
              value={
                o.receiptUrl ? (
                  <a href={o.receiptUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                    Ouvrir le reçu
                  </a>
                ) : (
                  <span className="text-muted-foreground">aucun</span>
                )
              }
            />
            {o.note && <Row label="Remarque du membre" value={o.note} />}
            {o.rejectionReason && <Row label="Motif du rejet" value={<span className="text-destructive">{o.rejectionReason}</span>} />}
            {o.validatedAt && <Row label="Validée le" value={fmtDate(o.validatedAt, true)} />}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="px-5 py-2">
            <Row label="Membre" value={<Link href={`/admin/membres/${o.user.id}`} className="underline underline-offset-4">{o.user.name}</Link>} />
            <Row label="Numéro" value={o.user.memberNumber} />
            {o.user.phone && <Row label="Téléphone" value={o.user.phone} />}
            <Row label="E-mail" value={o.user.email} />
          </Card>
          {canEdit && <OrderActions id={o.id} status={o.status} shortage={shortage.map((s) => s.product.title)} refs={{ claimReference: o.claimReference, salesNo: o.salesNo ?? "" }} />}
        </div>
      </div>
    </div>
  );
}
