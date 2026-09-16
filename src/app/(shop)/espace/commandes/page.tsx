import Link from "next/link";
import { db } from "@/lib/db";
import { pageUser } from "@/lib/pageAuth";
import { ButtonLink, Empty, Money, PageTitle, StatusPill, fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const me = await pageUser("/espace/commandes");
  const orders = await db.order.findMany({
    where: { userId: me.id },
    select: { id: true, orderNumber: true, status: true, total: true, createdAt: true, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <>
      <PageTitle title="Mes commandes" action={<ButtonLink href="/" variant="secondary">Nouvelle commande</ButtonLink>} />
      {orders.length === 0 ? (
        <Empty title="Aucune commande" hint="Vos reçus envoyés apparaîtront ici." action={<ButtonLink href="/">Voir la boutique</ButtonLink>} />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/espace/commandes/${o.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted">
                <div className="min-w-0">
                  <p className="font-medium">{o.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {fmtDate(o.createdAt)} · {o._count.items} article{o._count.items > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusPill status={o.status} />
                  <Money value={o.total} className="text-xl" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
