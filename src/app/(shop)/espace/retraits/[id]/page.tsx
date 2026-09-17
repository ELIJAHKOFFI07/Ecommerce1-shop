import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { pageUser } from "@/lib/pageAuth";
import { uuid } from "@/lib/validators";
import { Alert, Card, Money, Row, StatusPill, fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";

const EXPLAIN: Record<string, string> = {
  PENDING: "Votre demande est en attente d’approbation.",
  APPROVED: "Demande approuvée : présentez-vous au bureau avec votre numéro de membre. Si une TVA est due, elle sera réglée sur place ou depuis votre solde.",
  DELIVERED: "Produits remis. Merci !",
  REJECTED: "Demande refusée.",
};

export default async function DeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await pageUser();
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const d = await db.delivery.findFirst({
    where: { id: parsed.data, userId: me.id },
    select: {
      id: true, status: true, recipientName: true, recipientPhone: true, tva: true, tvaPaid: true, tvaPaymentMethod: true, rejectionReason: true, createdAt: true, approvedAt: true, deliveredAt: true,
      items: { select: { id: true, quantity: true, product: { select: { title: true, images: true } } } },
    },
  });
  if (!d) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/espace/retraits" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Mes retraits
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold">Retrait</h1>
          <p className="mt-1 text-muted-foreground">Demandé le {fmtDate(d.createdAt, true)}</p>
        </div>
        <div className="flex items-center gap-3">
          {["APPROVED", "DELIVERED"].includes(d.status) && (
            <Link href={`/espace/retraits/${d.id}/recu`} className="press inline-flex h-10 items-center rounded-md border border-border-strong bg-card px-4 text-sm font-semibold hover:bg-muted">
              Bon de retrait
            </Link>
          )}
          <StatusPill status={d.status} />
        </div>
      </div>
      <Alert tone={d.status === "REJECTED" ? "error" : d.status === "APPROVED" ? "success" : "info"}>
        {EXPLAIN[d.status]}
        {d.rejectionReason && (
          <>
            <br />
            <strong>Motif :</strong> {d.rejectionReason}
          </>
        )}
      </Alert>
      <Card className="divide-y divide-border px-5">
        {d.items.map((it) => (
          <div key={it.id} className="flex items-center gap-4 py-4">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {it.product.images[0] ? <img src={it.product.images[0]} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <p className="min-w-0 flex-1 font-medium">{it.product.title}</p>
            <p className="font-display text-2xl font-semibold tabular">{it.quantity}</p>
          </div>
        ))}
      </Card>
      <Card className="px-5 py-2">
        {d.tva !== null && Number(d.tva) > 0 && <Row label="TVA" value={<><Money value={d.tva} /> — {d.tvaPaid ? `payée (${d.tvaPaymentMethod === "WALLET" ? "solde" : "sur place"})` : "à payer"}</>} />}
        {d.recipientName && <Row label="Retiré par" value={`${d.recipientName}${d.recipientPhone ? ` · ${d.recipientPhone}` : ""}`} />}
        {d.approvedAt && <Row label="Approuvé le" value={fmtDate(d.approvedAt, true)} />}
        {d.deliveredAt && <Row label="Remis le" value={fmtDate(d.deliveredAt, true)} />}
      </Card>
    </div>
  );
}
