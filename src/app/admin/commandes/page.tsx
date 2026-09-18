import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { Empty, Money, PageTitle, StatusPill, fmtDate } from "@/components/ui";
import { FilterTabs, Pagination, SearchBox, Table, td } from "@/components/admin";
import type { OrderStatus, Prisma } from "../../../../prisma/generated/client";

export const dynamic = "force-dynamic";
const LIMIT = 50;
const STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; paiement?: string; q?: string; page?: string }> }) {
  await pageModule("orders");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined;
  const q = sp.q?.trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(sp.paiement === "UNPAID" ? { paymentMethod: "MOBILE_MONEY", paymentStatus: "UNPAID", status: { not: "CANCELLED" } } : {}),
    ...(q ? { OR: [{ orderNumber: { contains: q.toUpperCase() } }, { shipFullName: { contains: q, mode: "insensitive" } }, { shipPhone: { contains: q.replace(/\s+/g, "") } }, { user: { email: { contains: q.toLowerCase() } } }] } : {}),
  };
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      select: { id: true, orderNumber: true, status: true, paymentMethod: true, paymentStatus: true, total: true, shipFullName: true, shipPhone: true, shipCity: true, createdAt: true, _count: { select: { items: true } } },
      orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
      skip: (page - 1) * LIMIT,
      take: LIMIT,
    }),
    db.order.count({ where }),
  ]);

  return (
    <>
      <PageTitle title="Commandes" subtitle={`${total} au total`} />
      <div className="mb-5 space-y-3">
        <Suspense>
          <SearchBox placeholder="N° de commande, nom, téléphone ou e-mail" />
          <FilterTabs param="status" options={[{ value: "", label: "Toutes" }, { value: "PENDING", label: "À confirmer" }, { value: "CONFIRMED", label: "À expédier" }, { value: "SHIPPED", label: "En livraison" }, { value: "DELIVERED", label: "Livrées" }, { value: "CANCELLED", label: "Annulées" }]} />
        </Suspense>
      </div>
      {orders.length === 0 ? (
        <Empty title="Aucune commande" />
      ) : (
        <Table head={["Commande", "Client", "Date", "Statut", "Paiement", "Total"]}>
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-muted">
              <td className={td}>
                <Link href={`/admin/commandes/${o.id}`} className="font-semibold underline-offset-4 hover:underline">
                  {o.orderNumber}
                </Link>
                <div className="text-xs text-muted-foreground">{o._count.items} article(s)</div>
              </td>
              <td className={td}>
                {o.shipFullName}
                <div className="text-xs text-muted-foreground">{o.shipPhone} · {o.shipCity}</div>
              </td>
              <td className={`${td} whitespace-nowrap text-sm`}>{fmtDate(o.createdAt)}</td>
              <td className={td}><StatusPill status={o.status} /></td>
              <td className={`${td} text-sm`}>
                {o.paymentMethod === "MOBILE_MONEY" ? "Mobile Money" : "À la livraison"}
                <div><StatusPill status={o.paymentStatus} /></div>
              </td>
              <td className={`${td} text-right`}><Money value={o.total} className="text-lg" /></td>
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
