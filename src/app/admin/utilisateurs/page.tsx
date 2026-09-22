import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { ButtonLink, Empty, Money, PageTitle, fmtDate } from "@/components/ui";
import { FilterTabs, Pagination, SearchBox } from "@/components/admin";
import type { Role } from "../../../../prisma/generated/client";
import { ROLE_LABEL } from "./labels";

export const dynamic = "force-dynamic";
const LIMIT = 24;

/// Utilisateurs en cadres : on tape un nom, un e-mail ou un téléphone ;
/// chaque cadre mène à la fiche complète (commandes, adresses, gestion).
export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; role?: string }> }) {
  const { canEdit } = await pageModule("users");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);
  const where = {
    ...(sp.role === "staff" ? { role: { in: ["SUPER_ADMIN", "ADMIN", "STOCK_MANAGER", "SUPPORT"] as Role[] } } : sp.role === "blocked" ? { blocked: true } : { role: "CLIENT" as Role }),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q.toLowerCase() } }, { phone: { contains: q.replace(/\s+/g, "") } }] } : {}),
  };
  const [items, total] = await Promise.all([
    db.user.findMany({
      where,
      select: { id: true, name: true, email: true, phone: true, role: true, blocked: true, createdAt: true, image: true, _count: { select: { orders: true } }, orders: { where: { status: "DELIVERED" }, select: { total: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * LIMIT,
      take: LIMIT,
    }),
    db.user.count({ where }),
  ]);

  return (
    <>
      <PageTitle title="Utilisateurs et rôles" subtitle={`${total} au total — cliquez sur un cadre pour modifier le compte, le rôle et les accès`} action={canEdit ? <ButtonLink href="/admin/utilisateurs/nouveau">+ Créer un utilisateur</ButtonLink> : undefined} />
      <div className="mb-6 space-y-3">
        <Suspense>
          <SearchBox placeholder="Nom, e-mail ou téléphone" />
          <FilterTabs param="role" options={[{ value: "", label: "Clients" }, { value: "staff", label: "Équipe (admins)" }, { value: "blocked", label: "Bloqués" }]} />
        </Suspense>
      </div>
      {items.length === 0 ? (
        <Empty title="Aucun résultat" hint={q ? "Essayez avec l’e-mail ou le téléphone." : undefined} />
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((u) => {
            const spent = u.orders.reduce((n, o) => n + Number(o.total), 0);
            return (
              <Link key={u.id} href={`/admin/utilisateurs/${u.id}`} className={`press rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted ${u.blocked ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {u.image ? <img src={u.image} alt="" className="h-full w-full object-cover" /> : u.name.trim()[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{u.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                    {u.phone && <p className="text-sm text-muted-foreground">{u.phone}</p>}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5 text-xs font-semibold">
                  <span className="rounded-full bg-muted px-2.5 py-1">{ROLE_LABEL[u.role]}</span>
                  {u.blocked && <span className="rounded-full bg-destructive px-2.5 py-1 text-destructive-foreground">Bloqué</span>}
                </div>
                <div className="mt-4 flex items-end justify-between border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">
                    {u._count.orders} commande{u._count.orders > 1 ? "s" : ""}
                    <br />
                    <span className="text-xs">Inscrit le {fmtDate(u.createdAt)}</span>
                  </span>
                  <Money value={spent} className="text-xl" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <Suspense>
        <Pagination page={page} pages={Math.ceil(total / LIMIT)} />
      </Suspense>
    </>
  );
}
