import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { uuid } from "@/lib/validators";
import { Card, Money, PageTitle, Row, StatusPill, fmtDate } from "@/components/ui";
import { DeliveryActions } from "./DeliveryActions";

export const dynamic = "force-dynamic";

export default async function AdminDeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { canEdit } = await pageModule("deliveries");
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const d = await db.delivery.findUnique({
    where: { id: parsed.data },
    select: {
      id: true, status: true, recipientName: true, recipientPhone: true, tva: true, tvaPaid: true, tvaPaymentMethod: true, rejectionReason: true, createdAt: true, approvedAt: true, deliveredAt: true,
      user: { select: { id: true, name: true, memberNumber: true, phone: true, wallet: { select: { balance: true } } } },
      approvedBy: { select: { name: true } },
      deliveredBy: { select: { name: true } },
      items: { select: { id: true, quantity: true, product: { select: { id: true, title: true, stockBureau: true } } } },
    },
  });
  if (!d) notFound();
  const userStocks = await db.userStock.findMany({ where: { userId: d.user.id, productId: { in: d.items.map((i) => i.product.id) } }, select: { productId: true, quantity: true } });
  const problems = d.items.flatMap((it) => {
    const own = userStocks.find((s) => s.productId === it.product.id)?.quantity ?? 0;
    const out: string[] = [];
    if (own < it.quantity) out.push(`${it.product.title} : le membre n’en possède que ${own}`);
    if (it.product.stockBureau < it.quantity) out.push(`${it.product.title} : stock bureau ${it.product.stockBureau} seulement`);
    return out;
  });

  return (
    <div className="space-y-6">
      <Link href="/admin/retraits" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Retraits
      </Link>
      <PageTitle title={`Retrait · ${d.user.name}`} subtitle={`Demandé le ${fmtDate(d.createdAt, true)}`} action={<div className="flex items-center gap-3">{["APPROVED", "DELIVERED"].includes(d.status) && <Link href={`/espace/retraits/${d.id}/recu`} className="press inline-flex h-10 items-center rounded-md border border-border-strong bg-card px-4 text-sm font-semibold hover:bg-muted">Bon de retrait</Link>}<StatusPill status={d.status} /></div>} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="divide-y divide-border px-5">
            {d.items.map((it) => {
              const own = userStocks.find((s) => s.productId === it.product.id)?.quantity ?? 0;
              return (
                <div key={it.id} className="flex items-center gap-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/produits/${it.product.id}`} className="font-medium underline-offset-4 hover:underline">
                      {it.product.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      possède <strong className={own < it.quantity ? "text-destructive" : ""}>{own}</strong> · stock bureau <strong className={it.product.stockBureau < it.quantity ? "text-destructive" : ""}>{it.product.stockBureau}</strong>
                    </p>
                  </div>
                  <p className="font-display text-2xl font-semibold tabular">{it.quantity}</p>
                </div>
              );
            })}
          </Card>
          <Card className="px-5 py-2">
            <Row label="Retiré par" value={d.recipientName ? `${d.recipientName}${d.recipientPhone ? ` · ${d.recipientPhone}` : ""}` : "le membre"} />
            {d.rejectionReason && <Row label="Motif du refus" value={<span className="text-destructive">{d.rejectionReason}</span>} />}
            {d.approvedAt && <Row label="Approuvé" value={`${fmtDate(d.approvedAt, true)} par ${d.approvedBy?.name ?? "—"}`} />}
            {d.deliveredAt && <Row label="Remis" value={`${fmtDate(d.deliveredAt, true)} par ${d.deliveredBy?.name ?? "—"}`} />}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="px-5 py-2">
            <Row label="Membre" value={<Link href={`/admin/membres/${d.user.id}`} className="underline underline-offset-4">{d.user.name}</Link>} />
            <Row label="Numéro" value={d.user.memberNumber} />
            {d.user.phone && <Row label="Téléphone" value={d.user.phone} />}
            <Row label="Solde" value={<Money value={d.user.wallet?.balance ?? 0} />} />
          </Card>
          {canEdit && <DeliveryActions id={d.id} status={d.status} tva={d.tva ? Number(d.tva) : null} tvaPaid={d.tvaPaid} balance={Number(d.user.wallet?.balance ?? 0)} problems={problems} />}
        </div>
      </div>
    </div>
  );
}
