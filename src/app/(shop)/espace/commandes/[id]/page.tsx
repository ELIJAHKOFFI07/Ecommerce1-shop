import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { pageUser } from "@/lib/pageAuth";
import { uuid } from "@/lib/validators";
import { Alert, Card, Money, Row, StatusPill, fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";

const EXPLAIN: Record<string, string> = {
  PENDING: "L’administration vérifie votre reçu. Vous recevrez un e-mail dès qu’elle a terminé.",
  VALIDATED: "Reçu validé : les produits sont dans votre stock. Vous pouvez demander un retrait.",
  REJECTED: "Reçu refusé. Vérifiez le motif ci-dessous et renvoyez un reçu si nécessaire.",
  CANCELLED: "Commande annulée.",
  REFUNDED: "Commande remboursée.",
  DELIVERED: "Commande livrée.",
};

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ envoyee?: string }> }) {
  const me = await pageUser();
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const { envoyee } = await searchParams;
  // Filtré par userId : la commande d'un autre membre est introuvable.
  const o = await db.order.findFirst({
    where: { id: parsed.data, userId: me.id },
    select: {
      id: true, orderNumber: true, status: true, subTotal: true, taxTotal: true, total: true, claimReference: true, salesNo: true, receiptUrl: true, note: true, rejectionReason: true, createdAt: true, validatedAt: true,
      items: { select: { id: true, quantity: true, unitPrice: true, totalPrice: true, product: { select: { title: true, slug: true, images: true } } } },
    },
  });
  if (!o) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/espace/commandes" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Mes commandes
      </Link>
      {envoyee && <Alert tone="success">Reçu envoyé. L’administration va le vérifier.</Alert>}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold">{o.orderNumber}</h1>
          <p className="mt-1 text-muted-foreground">Envoyée le {fmtDate(o.createdAt, true)}</p>
        </div>
        <div className="flex items-center gap-3">
          {["VALIDATED", "DELIVERED"].includes(o.status) && (
            <Link href={`/espace/commandes/${o.id}/recu`} className="press inline-flex h-10 items-center rounded-md border border-border-strong bg-card px-4 text-sm font-semibold hover:bg-muted">
              Reçu
            </Link>
          )}
          <StatusPill status={o.status} />
        </div>
      </div>

      <Alert tone={o.status === "REJECTED" ? "error" : o.status === "VALIDATED" ? "success" : "info"}>
        {EXPLAIN[o.status]}
        {o.rejectionReason && (
          <>
            <br />
            <strong>Motif :</strong> {o.rejectionReason}
          </>
        )}
      </Alert>

      <Card className="divide-y divide-border px-5">
        {o.items.map((it) => (
          <div key={it.id} className="flex items-center gap-4 py-4">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {it.product.images[0] ? <img src={it.product.images[0]} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{it.product.title}</p>
              <p className="text-sm text-muted-foreground">
                {it.quantity} × <Money value={it.unitPrice} className="text-sm" />
              </p>
            </div>
            <Money value={it.totalPrice} className="text-lg" />
          </div>
        ))}
        <div className="py-3">
          <Row label="Sous-total" value={<Money value={o.subTotal} />} />
          <Row label="TVA (à régler au retrait)" value={<Money value={o.taxTotal} />} />
          <Row label="Total" value={<Money value={o.total} className="text-2xl" />} />
        </div>
      </Card>

      <Card className="px-5 py-2">
        <Row label="Claim Reference" value={<span className="font-mono">{o.claimReference}</span>} />
        {o.salesNo && <Row label="Sales No" value={<span className="font-mono">{o.salesNo}</span>} />}
        {o.receiptUrl && (
          <Row
            label="Reçu joint"
            value={
              <a href={o.receiptUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                Ouvrir
              </a>
            }
          />
        )}
        {o.note && <Row label="Remarque" value={o.note} />}
      </Card>
    </div>
  );
}
