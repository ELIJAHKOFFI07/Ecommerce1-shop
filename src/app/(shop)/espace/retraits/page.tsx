import Link from "next/link";
import { db } from "@/lib/db";
import { pageUser } from "@/lib/pageAuth";
import { ButtonLink, Empty, Money, PageTitle, StatusPill, fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DeliveriesPage() {
  const me = await pageUser("/espace/retraits");
  const list = await db.delivery.findMany({
    where: { userId: me.id },
    select: { id: true, status: true, tva: true, tvaPaid: true, createdAt: true, items: { select: { quantity: true, product: { select: { title: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <>
      <PageTitle title="Mes retraits" subtitle="Retirez vos produits au bureau." action={<ButtonLink href="/espace/retraits/nouveau">Demander un retrait</ButtonLink>} />
      {list.length === 0 ? (
        <Empty title="Aucun retrait" hint="Demandez un retrait pour récupérer vos produits au bureau." action={<ButtonLink href="/espace/retraits/nouveau">Demander un retrait</ButtonLink>} />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {list.map((d) => (
            <li key={d.id}>
              <Link href={`/espace/retraits/${d.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted">
                <div className="min-w-0">
                  <p className="truncate font-medium">{d.items.map((i) => `${i.quantity} × ${i.product.title}`).join(", ")}</p>
                  <p className="text-sm text-muted-foreground">
                    {fmtDate(d.createdAt)}
                    {d.tva && Number(d.tva) > 0 ? (
                      <>
                        {" "}· TVA <Money value={d.tva} className="text-sm" /> {d.tvaPaid ? "payée" : "à payer"}
                      </>
                    ) : null}
                  </p>
                </div>
                <StatusPill status={d.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
