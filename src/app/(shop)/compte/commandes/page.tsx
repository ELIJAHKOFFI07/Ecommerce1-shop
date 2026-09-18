import Link from "next/link";
import { db } from "@/lib/db";
import { pageUser } from "@/lib/pageAuth";
import { ButtonLink, Empty, Money, PageTitle, StatusPill, fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const me = await pageUser("/compte/commandes");
  const orders = await db.order.findMany({ where: { userId: me.id }, select: { id: true, orderNumber: true, status: true, paymentStatus: true, total: true, createdAt: true, items: { select: { image: true, quantity: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      <PageTitle title="Mes commandes" action={<ButtonLink href="/" variant="secondary">Continuer mes achats</ButtonLink>} />
      {orders.length === 0 ? (
        <Empty title="Aucune commande" hint="Vos commandes apparaîtront ici." action={<ButtonLink href="/">Voir la boutique</ButtonLink>} />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/compte/commandes/${o.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-muted">
                <div className="flex -space-x-3">
                  {o.items.slice(0, 3).map((it, i) => (
                    <span key={i} className="scene relative h-12 w-12 overflow-hidden rounded-full border-2 border-card p-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {it.image ? <img src={it.image} alt="" className="relative z-10 h-full w-full object-contain" /> : null}
                    </span>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{o.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">{fmtDate(o.createdAt)} · {o.items.reduce((n, i) => n + i.quantity, 0)} article(s)</p>
                </div>
                <div className="flex shrink-0 items-center gap-3"><StatusPill status={o.status} /><Money value={o.total} className="text-xl" /></div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
