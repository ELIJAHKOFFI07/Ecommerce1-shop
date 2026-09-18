import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { REASON_LABEL } from "@/lib/stockLabels";
import { Empty, PageTitle, fmtDate } from "@/components/ui";
import { Pagination, Table, td } from "@/components/admin";

export const dynamic = "force-dynamic";
const LIMIT = 100;

export default async function MovementsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await pageModule("stock");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [items, total] = await Promise.all([
    db.stockMovement.findMany({
      select: { id: true, quantity: true, reason: true, note: true, createdAt: true, product: { select: { id: true, title: true } }, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * LIMIT,
      take: LIMIT,
    }),
    db.stockMovement.count(),
  ]);

  return (
    <>
      <PageTitle title="Historique des mouvements" subtitle={`${total} mouvements`} />
      {items.length === 0 ? (
        <Empty title="Aucun mouvement" />
      ) : (
        <Table head={["Date", "Produit", "Quantité", "Motif", "Par"]}>
          {items.map((m) => (
            <tr key={m.id}>
              <td className={`${td} whitespace-nowrap text-sm`}>{fmtDate(m.createdAt, true)}</td>
              <td className={td}>
                <Link href={`/admin/produits/${m.product.id}`} className="font-medium underline-offset-4 hover:underline">
                  {m.product.title}
                </Link>
              </td>
              <td className={`${td} tabular font-semibold ${m.quantity < 0 ? "text-destructive" : "text-success"}`}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
              <td className={`${td} text-sm`}>
                {REASON_LABEL[m.reason]}
                {m.note && <div className="text-xs text-muted-foreground">{m.note}</div>}
              </td>
              <td className={`${td} text-sm text-muted-foreground`}>{m.user?.name ?? "—"}</td>
            </tr>
          ))}
        </Table>
      )}
      <Suspense>
        <Pagination page={page} pages={Math.ceil(total / LIMIT)} />
      </Suspense>
    </>
  );
}
