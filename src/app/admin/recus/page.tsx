import Link from "next/link";
import { Suspense } from "react";
import { FileText } from "lucide-react";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { Empty, Money, PageTitle, StatusPill, fmtDate } from "@/components/ui";
import { FilterTabs, Pagination, SearchBox, Table, td } from "@/components/admin";

export const dynamic = "force-dynamic";
const LIMIT = 50;

/// Gestion des reçus : chaque commande EST un reçu envoyé. Cette vue est
/// centrée sur le document : recherche par Claim Reference / Sales No /
/// membre, lien direct vers le PDF, filtre « sans pièce jointe ».
export default async function ReceiptsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; piece?: string }> }) {
  await pageModule("orders");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);
  const where = {
    ...(sp.piece === "sans" ? { receiptUrl: null } : sp.piece === "avec" ? { receiptUrl: { not: null } } : {}),
    ...(q
      ? { OR: [{ claimReference: { contains: q, mode: "insensitive" as const } }, { salesNo: { contains: q, mode: "insensitive" as const } }, { orderNumber: { contains: q.toUpperCase() } }, { user: { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { memberNumber: { contains: q.toUpperCase() } }] } }] }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.order.findMany({ where, select: { id: true, orderNumber: true, claimReference: true, salesNo: true, receiptUrl: true, status: true, total: true, createdAt: true, user: { select: { id: true, name: true, memberNumber: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * LIMIT, take: LIMIT }),
    db.order.count({ where }),
  ]);

  return (
    <>
      <PageTitle title="Reçus" subtitle={`${total} reçu${total > 1 ? "s" : ""} envoyé${total > 1 ? "s" : ""}`} />
      <div className="mb-5 space-y-3">
        <Suspense>
          <FilterTabs param="piece" options={[{ value: "", label: "Tous" }, { value: "avec", label: "Avec pièce jointe" }, { value: "sans", label: "Sans pièce jointe" }]} />
          <SearchBox placeholder="Claim Reference, Sales No, n° de commande ou membre" />
        </Suspense>
      </div>
      {items.length === 0 ? (
        <Empty title="Aucun reçu" />
      ) : (
        <Table head={["Claim Reference", "Sales No", "Membre", "Commande", "Date", "Statut", "Pièce"]}>
          {items.map((o) => (
            <tr key={o.id} className="hover:bg-muted">
              <td className={`${td} font-mono text-sm`}>
                <Link href={`/admin/commandes/${o.id}`} className="font-semibold underline-offset-4 hover:underline">
                  {o.claimReference}
                </Link>
              </td>
              <td className={`${td} font-mono text-sm text-muted-foreground`}>{o.salesNo ?? "—"}</td>
              <td className={`${td} text-sm`}>
                <Link href={`/admin/membres/${o.user.id}`} className="underline-offset-4 hover:underline">
                  {o.user.name}
                </Link>
                <div className="text-xs text-muted-foreground">{o.user.memberNumber}</div>
              </td>
              <td className={`${td} text-sm`}>
                {o.orderNumber}
                <div className="text-xs"><Money value={o.total} className="text-xs" /></div>
              </td>
              <td className={`${td} whitespace-nowrap text-sm`}>{fmtDate(o.createdAt)}</td>
              <td className={td}><StatusPill status={o.status} /></td>
              <td className={td}>
                {o.receiptUrl ? (
                  <a href={o.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline">
                    <FileText className="h-4 w-4" aria-hidden /> Ouvrir
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">aucune</span>
                )}
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
