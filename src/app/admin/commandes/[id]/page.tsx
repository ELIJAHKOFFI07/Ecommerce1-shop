import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { uuid } from "@/lib/validators";
import { Alert, Card, Money, PageTitle, Row, StatusPill, fmtDate } from "@/components/ui";
import { OrderActions } from "./OrderActions";

export const dynamic = "force-dynamic";

const EXPLAIN: Record<string, string> = {
  PENDING: "Nouvelle commande. Vérifiez le stock puis confirmez — ou annulez avec un motif.",
  CONFIRMED: "Confirmée : le stock est réservé. Quand le colis part, marquez-la expédiée.",
  SHIPPED: "En cours de livraison. Une fois remise au client, marquez-la livrée.",
  DELIVERED: "Livrée et encaissée.",
  CANCELLED: "Annulée. Le stock a été restitué si la commande était confirmée.",
};

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { canEdit } = await pageModule("orders");
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const o = await db.order.findUnique({
    where: { id: parsed.data },
    include: { items: { include: { product: { select: { stock: true, active: true } } } }, user: { select: { id: true, name: true, email: true, phone: true } } },
  });
  if (!o) notFound();
  const shortage = o.status === "PENDING" ? o.items.filter((it) => it.product.stock < it.quantity).map((it) => `${it.title} (reste ${it.product.stock})`) : [];

  return (
    <div className="space-y-6">
      <PageTitle title={o.orderNumber} subtitle={`Passée le ${fmtDate(o.createdAt, true)}`} action={<StatusPill status={o.status} />} />
      <Alert tone={o.status === "CANCELLED" ? "error" : o.status === "DELIVERED" ? "success" : "info"}>
        {EXPLAIN[o.status]}{o.cancelReason && <><br /><strong>Motif :</strong> {o.cancelReason}</>}
      </Alert>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card className="divide-y divide-border px-5">
            {o.items.map((it) => (
              <div key={it.id} className="flex items-center gap-4 py-4">
                <div className="scene relative h-14 w-14 shrink-0 overflow-hidden rounded-md p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {it.image ? <img src={it.image} alt="" className="relative z-10 h-full w-full object-contain" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/produits/${it.productId}`} className="font-medium underline-offset-4 hover:underline">{it.title}</Link>
                  <p className="text-sm text-muted-foreground">{it.quantity} × <Money value={it.unitPrice} className="text-sm" /> · stock actuel {it.product.stock}</p>
                </div>
                <Money value={it.totalPrice} className="text-lg" />
              </div>
            ))}
            <div className="py-3">
              <Row label="Sous-total" value={<Money value={o.subTotal} />} />
              <Row label="Livraison" value={Number(o.shippingFee) === 0 ? "Offerte" : <Money value={o.shippingFee} />} />
              <Row label="Total" value={<Money value={o.total} className="text-2xl" />} />
            </div>
          </Card>

          <Card className="px-5 py-2">
            <Row label="Client" value={<Link href={`/admin/utilisateurs/${o.user.id}`} className="underline underline-offset-4">{o.user.name}</Link>} />
            <Row label="E-mail" value={o.user.email} />
            <Row label="Livrer à" value={`${o.shipFullName} · ${o.shipPhone}`} />
            <Row label="Adresse" value={`${o.shipDetails}, ${o.shipCommune ? `${o.shipCommune}, ` : ""}${o.shipCity}`} />
            <Row label="Paiement" value={<span className="inline-flex flex-wrap items-center gap-2"><StatusPill status={o.paymentMethod} /><StatusPill status={o.paymentStatus} />{o.paymentRef && <span className="font-mono text-sm">{o.paymentRef}</span>}</span>} />
            {o.note && <Row label="Remarque du client" value={o.note} />}
            {o.confirmedAt && <Row label="Confirmée le" value={fmtDate(o.confirmedAt, true)} />}
            {o.shippedAt && <Row label="Expédiée le" value={fmtDate(o.shippedAt, true)} />}
            {o.deliveredAt && <Row label="Livrée le" value={fmtDate(o.deliveredAt, true)} />}
          </Card>
        </div>

        {canEdit ? <OrderActions id={o.id} status={o.status} paymentMethod={o.paymentMethod} paymentStatus={o.paymentStatus} shortage={shortage} /> : <Card className="h-fit p-5 text-sm text-muted-foreground">Lecture seule.</Card>}
      </div>
    </div>
  );
}
