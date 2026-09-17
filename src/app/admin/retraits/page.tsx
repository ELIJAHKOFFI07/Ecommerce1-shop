import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { Empty, Money, PageTitle, StatusPill, fmtDate } from "@/components/ui";
import { FilterTabs, Pagination, Table, td } from "@/components/admin";
import type { DeliveryStatus } from "../../../../prisma/generated/client";

export const dynamic = "force-dynamic";
const LIMIT = 50;
const STATUSES: DeliveryStatus[] = ["PENDING", "APPROVED", "DELIVERED", "REJECTED"];

export default async function AdminDeliveriesPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await pageModule("deliveries");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as DeliveryStatus) ? (sp.status as DeliveryStatus) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = status ? { status } : {};
  const [list, total] = await Promise.all([
    db.delivery.findMany({
      where,
      select: { id: true, status: true, tva: true, tvaPaid: true, createdAt: true, user: { select: { name: true, memberNumber: true } }, items: { select: { quantity: true, product: { select: { title: true } } } } },
      orderBy: { createdAt: status === "DELIVERED" || status === "REJECTED" ? "desc" : "asc" },
      skip: (page - 1) * LIMIT,
      take: LIMIT,
    }),
    db.delivery.count({ where }),
  ]);

  return (
    <>
      <PageTitle title="Retraits" subtitle={`${total} au total`} />
      <div className="mb-5">
        <Suspense>
          <FilterTabs param="status" options={[{ value: "", label: "Tous" }, { value: "PENDING", label: "À approuver" }, { value: "APPROVED", label: "À remettre" }, { value: "DELIVERED", label: "Remis" }, { value: "REJECTED", label: "Refusés" }]} />
        </Suspense>
      </div>
      {list.length === 0 ? (
        <Empty title="Aucun retrait" />
      ) : (
        <Table head={["Membre", "Produits", "TVA", "Date", "Statut"]}>
          {list.map((d) => (
            <tr key={d.id} className="hover:bg-muted">
              <td className={td}>
                <Link href={`/admin/retraits/${d.id}`} className="font-semibold underline-offset-4 hover:underline">
                  {d.user.name}
                </Link>
                <div className="text-xs text-muted-foreground">{d.user.memberNumber}</div>
              </td>
              <td className={`${td} max-w-sm truncate text-sm`}>{d.items.map((i) => `${i.quantity} × ${i.product.title}`).join(", ")}</td>
              <td className={`${td} whitespace-nowrap text-sm`}>
                {d.tva && Number(d.tva) > 0 ? (
                  <>
                    <Money value={d.tva} className="text-sm" /> {d.tvaPaid ? <span className="text-success">payée</span> : <span className="text-warning">à payer</span>}
                  </>
                ) : (
                  <span className="text-muted-foreground">non fixée</span>
                )}
              </td>
              <td className={`${td} whitespace-nowrap text-sm`}>{fmtDate(d.createdAt)}</td>
              <td className={td}>
                <StatusPill status={d.status} />
              </td>
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
