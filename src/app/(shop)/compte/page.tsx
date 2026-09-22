import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { pageUser } from "@/lib/pageAuth";
import { Card, Money, StatusPill, fmtDate, Alert, ButtonLink } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AccountHome({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const me = await pageUser("/compte");
  const { bienvenue } = await searchParams;
  const [user, orders, count] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: me.id }, select: { name: true } }),
    db.order.findMany({ where: { userId: me.id }, select: { id: true, orderNumber: true, status: true, total: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 3 }),
    db.order.count({ where: { userId: me.id } }),
  ]);
  const firstName = user.name.split(" ")[0];
  return (
    <div className="space-y-6">
      {bienvenue && <Alert tone="success">Bienvenue, {firstName} ! Votre compte est prêt.</Alert>}
      <div>
        <h1 className="font-display text-4xl font-semibold lg:text-5xl">Bonjour, {firstName}</h1>
        <p className="mt-1 text-muted-foreground">{count} commande{count > 1 ? "s" : ""}</p>
      </div>
      <div className="stagger grid gap-4 sm:grid-cols-3">
        <Tile href="/compte/commandes" label="Mes commandes" />
        <Tile href="/compte/adresses" label="Mes adresses" />
        <Tile href="/compte/profil" label="Mon profil" />
      </div>
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Dernières commandes</h2>
          <Link href="/compte/commandes" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">Toutes <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        {orders.length === 0 ? (
          <div className="mt-3"><p className="text-muted-foreground">Aucune commande pour le moment.</p><ButtonLink href="/" className="mt-3">Voir la boutique</ButtonLink></div>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/compte/commandes/${o.id}`} className="-mx-2 flex items-center justify-between gap-4 rounded-md p-2 hover:bg-muted">
                  <div><p className="font-medium">{o.orderNumber}</p><p className="text-sm text-muted-foreground">{fmtDate(o.createdAt)}</p></div>
                  <div className="flex items-center gap-3"><StatusPill status={o.status} /><Money value={o.total} className="text-xl" /></div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Tile({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="press rounded-lg border border-border bg-card p-5 font-semibold transition-colors hover:bg-muted">{label} →</Link>;
}
