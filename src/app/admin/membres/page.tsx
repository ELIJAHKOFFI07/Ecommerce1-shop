import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { ButtonLink, Empty, Money, PageTitle, fmtDate } from "@/components/ui";
import { FilterTabs, Pagination, SearchBox } from "@/components/admin";
import type { Role } from "../../../../prisma/generated/client";

export const dynamic = "force-dynamic";
const LIMIT = 24;
export const ROLE_LABEL: Record<string, string> = { SUPER_ADMIN: "Super admin", ADMIN: "Admin", STOCK_MANAGER: "Stock", SUPPORT: "Support", CLIENT: "Membre" };
export const STATUS_LABEL: Record<string, string> = { MEMBRE: "Membre", INDEPENDANT: "Indépendant", CHEF_EQUIPE: "Chef d’équipe" };

/// Clients en cadres : on tape un nom, un numéro, un e-mail ou un
/// téléphone ; chaque cadre mène à la fiche complète (commandes, reçus,
/// retraits, solde, informations).
export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; role?: string }> }) {
  const { canEdit } = await pageModule("users");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);
  const where = {
    ...(sp.role === "staff" ? { role: { in: ["SUPER_ADMIN", "ADMIN", "STOCK_MANAGER", "SUPPORT"] as Role[] } } : sp.role === "blocked" ? { blocked: true } : { role: "CLIENT" as Role }),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q.toLowerCase() } }, { memberNumber: { contains: q.toUpperCase() } }, { phone: { contains: q.replace(/\s+/g, "") } }, { pseudo: { contains: q, mode: "insensitive" as const } }] } : {}),
  };
  const [items, total] = await Promise.all([
    db.user.findMany({
      where,
      select: { id: true, name: true, memberNumber: true, email: true, phone: true, city: true, role: true, status: true, blocked: true, createdAt: true, image: true, wallet: { select: { balance: true } }, _count: { select: { orders: true, deliveries: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * LIMIT,
      take: LIMIT,
    }),
    db.user.count({ where }),
  ]);

  return (
    <>
      <PageTitle title="Clients" subtitle={`${total} au total`} action={canEdit ? <ButtonLink href="/admin/membres/nouveau">Créer un compte</ButtonLink> : undefined} />
      <div className="mb-6 space-y-3">
        <Suspense>
          <SearchBox placeholder="Nom, numéro de membre, e-mail ou téléphone" />
          <FilterTabs param="role" options={[{ value: "", label: "Clients" }, { value: "staff", label: "Équipe" }, { value: "blocked", label: "Bloqués" }]} />
        </Suspense>
      </div>
      {items.length === 0 ? (
        <Empty title="Aucun résultat" hint={q ? "Essayez avec le numéro de membre ou le téléphone." : undefined} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((u) => (
            <Link key={u.id} href={`/admin/membres/${u.id}`} className={`press rise rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted ${u.blocked ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {u.image ? <img src={u.image} alt="" className="h-full w-full object-cover" /> : u.name.trim()[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{u.name}</p>
                  <p className="font-mono text-sm text-muted-foreground">{u.memberNumber}</p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{u.phone ?? u.email}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5 text-xs font-semibold">
                <span className="rounded-full bg-muted px-2.5 py-1">{u.role === "CLIENT" ? STATUS_LABEL[u.status] : ROLE_LABEL[u.role]}</span>
                {u.blocked && <span className="rounded-full bg-destructive px-2.5 py-1 text-destructive-foreground">Bloqué</span>}
                {u.city && <span className="rounded-full bg-muted px-2.5 py-1">{u.city}</span>}
              </div>
              <div className="mt-4 flex items-end justify-between border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">
                  {u._count.orders} commande{u._count.orders > 1 ? "s" : ""} · {u._count.deliveries} retrait{u._count.deliveries > 1 ? "s" : ""}
                  <br />
                  <span className="text-xs">Inscrit le {fmtDate(u.createdAt)}</span>
                </span>
                <Money value={u.wallet?.balance ?? 0} className="text-xl" />
              </div>
            </Link>
          ))}
        </div>
      )}
      <Suspense>
        <Pagination page={page} pages={Math.ceil(total / LIMIT)} />
      </Suspense>
    </>
  );
}
