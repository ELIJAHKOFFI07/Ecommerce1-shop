import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pageUser } from "@/lib/pageAuth";
import { uuid } from "@/lib/validators";
import { Alert, Card, Money, Row, StatusPill, fmtDate } from "@/components/ui";
import { CancelOrder } from "./CancelOrder";

export const dynamic = "force-dynamic";

const EXPLAIN: Record<string, string> = {
  PENDING: "Nous avons bien reçu votre commande et la préparons. Vous recevrez un e-mail à chaque étape.",
  CONFIRMED: "Commande confirmée, en préparation.",
  SHIPPED: "Votre commande est en route. Le livreur vous appellera.",
  DELIVERED: "Commande livrée. Merci pour votre confiance !",
  CANCELLED: "Commande annulée.",
};

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const me = await pageUser();
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const { ok } = await searchParams;
  const [o, settings] = await Promise.all([
    db.order.findFirst({ where: { id: parsed.data, userId: me.id }, include: { items: true } }),
    db.settings.findUnique({ where: { id: 1 }, select: { mobileMoneyNumber: true, mobileMoneyName: true } }),
  ]);
  if (!o) notFound();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {ok && <Alert tone="success">Commande enregistrée. Merci !</Alert>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="font-display text-4xl font-semibold">{o.orderNumber}</h1><p className="mt-1 text-muted-foreground">Passée le {fmtDate(o.createdAt, true)}</p></div>
        <StatusPill status={o.status} />
      </div>
      <Alert tone={o.status === "CANCELLED" ? "error" : o.status === "DELIVERED" ? "success" : "info"}>
        {EXPLAIN[o.status]}{o.cancelReason && <><br /><strong>Motif :</strong> {o.cancelReason}</>}
      </Alert>
      {o.paymentMethod === "MOBILE_MONEY" && o.paymentStatus === "UNPAID" && o.status !== "CANCELLED" && settings?.mobileMoneyNumber && (
        <Alert tone="info">Pour confirmer : envoyez <strong><Money value={o.total} /></strong> par Mobile Money au <strong>{settings.mobileMoneyNumber}</strong>{settings.mobileMoneyName ? ` (${settings.mobileMoneyName})` : ""}, référence <strong>{o.orderNumber}</strong>.</Alert>
      )}
      <Card className="divide-y divide-border px-5">
        {o.items.map((it) => (
          <div key={it.id} className="flex items-center gap-4 py-4">
            <div className="scene relative h-14 w-14 shrink-0 overflow-hidden rounded-md p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {it.image ? <img src={it.image} alt="" className="relative z-10 h-full w-full object-contain" /> : null}
            </div>
            <div className="min-w-0 flex-1"><p className="font-medium">{it.title}</p><p className="text-sm text-muted-foreground">{it.quantity} × <Money value={it.unitPrice} className="text-sm" /></p></div>
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
        <Row label="Livraison à" value={`${o.shipFullName} · ${o.shipPhone}`} />
        <Row label="Adresse" value={`${o.shipDetails}, ${o.shipCommune ? `${o.shipCommune}, ` : ""}${o.shipCity}`} />
        <Row label="Paiement" value={<span className="inline-flex items-center gap-2"><StatusPill status={o.paymentMethod} /><StatusPill status={o.paymentStatus} /></span>} />
        {o.note && <Row label="Remarque" value={o.note} />}
      </Card>
      {["PENDING", "CONFIRMED"].includes(o.status) && <CancelOrder id={o.id} />}
    </div>
  );
}
