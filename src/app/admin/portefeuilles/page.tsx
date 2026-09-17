import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { ButtonLink, Card, Empty, Money, PageTitle, fmtDate } from "@/components/ui";
import { Pagination, SearchBox, Table, td } from "@/components/admin";

export const dynamic = "force-dynamic";
const LIMIT = 50;

export default async function WalletsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { user } = await pageModule("wallet");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);
  const where = q ? { user: { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { memberNumber: { contains: q.toUpperCase() } }, { email: { contains: q.toLowerCase() } }] } } : {};
  const [items, total, settings] = await Promise.all([
    db.wallet.findMany({ where, select: { id: true, balance: true, updatedAt: true, user: { select: { id: true, name: true, memberNumber: true } } }, orderBy: { updatedAt: "desc" }, skip: (page - 1) * LIMIT, take: LIMIT }),
    db.wallet.count({ where }),
    db.settings.findUnique({ where: { id: 1 }, select: { generalBalance: true, taxBalance: true } }),
  ]);

  return (
    <>
      <PageTitle title="Portefeuilles" action={user.role === "SUPER_ADMIN" ? <ButtonLink href="/admin/portefeuilles/general" variant="secondary">Solde général</ButtonLink> : undefined} />
      {settings && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <p className="text-sm font-semibold text-muted-foreground">Solde général (à distribuer)</p>
            <Money value={settings.generalBalance} className="mt-1 block text-3xl" />
          </Card>
          <Card className="p-5">
            <p className="text-sm font-semibold text-muted-foreground">Solde taxe (encaissé)</p>
            <Money value={settings.taxBalance} className="mt-1 block text-3xl" />
          </Card>
        </div>
      )}
      <div className="mb-5">
        <Suspense>
          <SearchBox placeholder="Nom, numéro ou e-mail" />
        </Suspense>
      </div>
      {items.length === 0 ? (
        <Empty title="Aucun portefeuille" />
      ) : (
        <Table head={["Membre", "Solde", "Dernier mouvement"]}>
          {items.map((w) => (
            <tr key={w.id} className="hover:bg-muted">
              <td className={td}>
                <Link href={`/admin/portefeuilles/${w.user.id}`} className="font-semibold underline-offset-4 hover:underline">
                  {w.user.name}
                </Link>
                <div className="text-xs text-muted-foreground">{w.user.memberNumber}</div>
              </td>
              <td className={td}>
                <Money value={w.balance} className="text-xl" />
              </td>
              <td className={`${td} text-sm text-muted-foreground`}>{fmtDate(w.updatedAt, true)}</td>
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
