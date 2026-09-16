import { db } from "@/lib/db";
import { pageUser } from "@/lib/pageAuth";
import { ButtonLink, Empty, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

/// Mon stock : ce que le membre possède et peut retirer au bureau.
export default async function MyStockPage() {
  const me = await pageUser("/espace/stock");
  const stocks = await db.userStock.findMany({
    where: { userId: me.id, quantity: { gt: 0 } },
    select: { id: true, quantity: true, product: { select: { title: true, images: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const total = stocks.reduce((n, s) => n + s.quantity, 0);

  return (
    <>
      <PageTitle title="Mon stock" subtitle={total ? `${total} produit(s) disponibles au retrait` : undefined} action={total ? <ButtonLink href="/espace/retraits/nouveau">Demander un retrait</ButtonLink> : undefined} />
      {stocks.length === 0 ? (
        <Empty title="Votre stock est vide" hint="Les produits de vos commandes validées apparaîtront ici." action={<ButtonLink href="/">Voir la boutique</ButtonLink>} />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {stocks.map((s) => (
            <li key={s.id} className="flex items-center gap-4 px-5 py-4">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {s.product.images[0] ? <img src={s.product.images[0]} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <p className="min-w-0 flex-1 font-medium">{s.product.title}</p>
              <p className="font-display text-2xl font-semibold tabular">{s.quantity}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
