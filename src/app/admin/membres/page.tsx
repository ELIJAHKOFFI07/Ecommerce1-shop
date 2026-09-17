import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { ButtonLink, Empty, Money, PageTitle, fmtDate } from "@/components/ui";
import { FilterTabs, Pagination, SearchBox, Table, td } from "@/components/admin";
import type { Role } from "../../../../prisma/generated/client";

export const dynamic = "force-dynamic";
const LIMIT = 50;
export const ROLE_LABEL: Record<string, string> = { SUPER_ADMIN: "Super admin", ADMIN: "Admin", STOCK_MANAGER: "Stock", SUPPORT: "Support", CLIENT: "Membre" };
export const STATUS_LABEL: Record<string, string> = { MEMBRE: "Membre", INDEPENDANT: "Indépendant", CHEF_EQUIPE: "Chef d’équipe" };

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; role?: string }> }) {
  const { canEdit } = await pageModule("users");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);
  const role = sp.role === "staff" ? { in: ["SUPER_ADMIN", "ADMIN", "STOCK_MANAGER", "SUPPORT"] as Role[] } : sp.role === "blocked" ? undefined : ("CLIENT" as Role);
  const where = {
    ...(sp.role === "blocked" ? { blocked: true } : role ? { role } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q.toLowerCase() } }, { memberNumber: { contains: q.toUpperCase() } }, { phone: { contains: q } }] } : {}),
  };
  const [items, total] = await Promise.all([
    db.user.findMany({ where, select: { id: true, name: true, memberNumber: true, email: true, phone: true, role: true, status: true, blocked: true, createdAt: true, wallet: { select: { balance: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * LIMIT, take: LIMIT }),
    db.user.count({ where }),
  ]);

  return (
    <>
      <PageTitle title="Membres" subtitle={`${total} au total`} action={canEdit ? <ButtonLink href="/admin/membres/nouveau">Créer un compte</ButtonLink> : undefined} />
      <div className="mb-5 space-y-3">
        <Suspense>
          <FilterTabs param="role" options={[{ value: "", label: "Membres" }, { value: "staff", label: "Équipe" }, { value: "blocked", label: "Bloqués" }]} />
          <SearchBox placeholder="Nom, numéro, e-mail ou téléphone" />
        </Suspense>
      </div>
      {items.length === 0 ? (
        <Empty title="Aucun résultat" />
      ) : (
        <Table head={["Nom", "Numéro", "Contact", "Statut", "Solde", "Inscrit"]}>
          {items.map((u) => (
            <tr key={u.id} className={`hover:bg-muted ${u.blocked ? "opacity-60" : ""}`}>
              <td className={td}>
                <Link href={`/admin/membres/${u.id}`} className="font-semibold underline-offset-4 hover:underline">
                  {u.name}
                </Link>
                {u.role !== "CLIENT" && <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">{ROLE_LABEL[u.role]}</span>}
                {u.blocked && <span className="ml-2 rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold uppercase text-destructive-foreground">bloqué</span>}
              </td>
              <td className={`${td} font-mono text-sm`}>{u.memberNumber}</td>
              <td className={`${td} text-sm`}>
                {u.email}
                {u.phone && <div className="text-muted-foreground">{u.phone}</div>}
              </td>
              <td className={`${td} text-sm`}>{STATUS_LABEL[u.status]}</td>
              <td className={td}>
                <Money value={u.wallet?.balance ?? 0} />
              </td>
              <td className={`${td} whitespace-nowrap text-sm text-muted-foreground`}>{fmtDate(u.createdAt)}</td>
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
