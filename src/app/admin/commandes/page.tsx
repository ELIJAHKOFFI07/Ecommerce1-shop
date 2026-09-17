import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { Empty, Money, PageTitle, StatusPill, fmtDate } from "@/components/ui";
import { FilterTabs, Pagination, Table, td } from "@/components/admin";
import type { OrderStatus } from "../../../../prisma/generated/client";

export const dynamic = "force-dynamic";
const LIMIT = 50;
const STATUSES: OrderStatus[] = ["PENDING", "VALIDATED", "DELIVERED", "REJECTED", "CANCELLED", "REFUNDED"];

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await pageModule("orders");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = status ? { status } : {};
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      select: { id: true, orderNumber: true, status: true, total: true, claimReference: true, createdAt: true, user: { select: { name: true, memberNumber: true } }, _count: { select: { items: true } } },
      orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
      skip: (page - 1) * LIMIT,
      take: LIMIT,
    }),
    db.order.count({ where }),
  ]);

  return (
    <>
      <PageTitle title="Commandes" subtitle={`${total} au total`} />
      <div className="mb-5">
        <Suspense>
          <FilterTabs param="status" options={[{ value: "", label: "Toutes" }, { value: "PENDING", label: "À vérifier" }, { value: "VALIDATED", label: "Validées" }, { value: "REJECTED", label: "Rejetées" }, { value: "CANCELLED", label: "Annulées" }]} />
        </Suspense>
      </div>
      {orders.length === 0 ? (
        <Empty title="Aucune commande" />
      ) : (
        <Table head={["Commande", "Membre", "Reçu", "Date", "Statut", "Total"]}>
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-muted">
              <td className={td}>
                <Link href={`/admin/commandes/${o.id}`} className="font-semibold underline-offset-4 hover:underline">
                  {o.orderNumber}
                </Link>
                <div className="text-xs text-muted-foreground">{o._count.items} article(s)</div>
              </td>
              <td className={td}>
                {o.user.name}
                <div className="text-xs text-muted-foreground">{o.user.memberNumber}</div>
              </td>
              <td className={`${td} font-mono text-sm`}>{o.claimReference}</td>
              <td className={`${td} whitespace-nowrap text-sm`}>{fmtDate(o.createdAt)}</td>
              <td className={td}>
                <StatusPill status={o.status} />
              </td>
              <td className={`${td} text-right`}>
                <Money value={o.total} className="text-lg" />
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
