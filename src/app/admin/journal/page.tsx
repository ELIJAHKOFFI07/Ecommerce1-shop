import { Suspense } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { pageStaff } from "@/lib/pageAuth";
import { Empty, PageTitle, fmtDate } from "@/components/ui";
import { Pagination, Table, td, FilterTabs } from "@/components/admin";

export const dynamic = "force-dynamic";
const LIMIT = 100;

/// Journal d'audit — qui a fait quoi, quand, depuis où.
export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string; action?: string }> }) {
  const user = await pageStaff();
  if (user.role !== "SUPER_ADMIN") redirect("/admin");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const action = sp.action?.slice(0, 40);
  const where = action ? { action: { startsWith: action } } : {};
  const [items, total] = await Promise.all([
    db.auditLog.findMany({ where, select: { id: true, action: true, target: true, ip: true, meta: true, createdAt: true, user: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * LIMIT, take: LIMIT }),
    db.auditLog.count({ where }),
  ]);

  return (
    <>
      <PageTitle title="Journal d’audit" subtitle={`${total} entrées`} />
      <div className="mb-5">
        <Suspense>
          <FilterTabs param="action" options={[{ value: "", label: "Tout" }, { value: "auth.", label: "Connexions" }, { value: "order.", label: "Commandes" }, { value: "product.", label: "Produits" }, { value: "stock.", label: "Stock" }, { value: "user.", label: "Comptes" }]} />
        </Suspense>
      </div>
      {items.length === 0 ? (
        <Empty title="Aucune entrée" />
      ) : (
        <Table head={["Date", "Action", "Par", "Cible", "IP", "Détails"]}>
          {items.map((l) => (
            <tr key={l.id}>
              <td className={`${td} whitespace-nowrap text-xs`}>{fmtDate(l.createdAt, true)}</td>
              <td className={`${td} font-mono text-xs`}>{l.action}</td>
              <td className={`${td} text-sm`}>{l.user ? `${l.user.name} (${l.user.email})` : "—"}</td>
              <td className={`${td} font-mono text-xs text-muted-foreground`}>{l.target?.slice(0, 8) ?? "—"}</td>
              <td className={`${td} font-mono text-xs text-muted-foreground`}>{l.ip ?? "—"}</td>
              <td className={`${td} max-w-xs truncate font-mono text-xs text-muted-foreground`}>{l.meta ? JSON.stringify(l.meta) : ""}</td>
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
