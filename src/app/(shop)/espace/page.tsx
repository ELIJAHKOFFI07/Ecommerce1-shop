import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { pageUser } from "@/lib/pageAuth";
import { Card, Money, StatusPill, fmtDate, Alert } from "@/components/ui";

export const dynamic = "force-dynamic";

/// Accueil membre : le solde, le stock, la dernière commande. Trois
/// blocs, chacun est un lien vers sa rubrique.
export default async function MemberHome({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const me = await pageUser("/espace");
  const { bienvenue } = await searchParams;
  const [user, stockCount, lastOrder, pendingDeliveries] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: me.id }, select: { name: true, memberNumber: true, wallet: { select: { balance: true } } } }),
    db.userStock.aggregate({ where: { userId: me.id, quantity: { gt: 0 } }, _sum: { quantity: true } }),
    db.order.findFirst({ where: { userId: me.id }, select: { id: true, orderNumber: true, status: true, total: true, createdAt: true }, orderBy: { createdAt: "desc" } }),
    db.delivery.count({ where: { userId: me.id, status: { in: ["PENDING", "APPROVED"] } } }),
  ]);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-6">
      {bienvenue && <Alert tone="success">Bienvenue, {firstName} ! Votre numéro de membre : <strong>{user.memberNumber}</strong>. Gardez-le, votre parrain en aura besoin.</Alert>}
      <div>
        <h1 className="font-display text-4xl font-semibold lg:text-5xl">Bonjour, {firstName}</h1>
        <p className="mt-1 text-muted-foreground">Membre n° {user.memberNumber}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Tile href="/espace/portefeuille" label="Mon solde">
          <Money value={user.wallet?.balance ?? 0} className="text-3xl" />
        </Tile>
        <Tile href="/espace/stock" label="Mon stock">
          <span className="font-display text-3xl font-semibold tabular">{stockCount._sum.quantity ?? 0}</span> <span className="text-muted-foreground">produit(s)</span>
        </Tile>
        <Tile href="/espace/retraits" label="Retraits en cours">
          <span className="font-display text-3xl font-semibold tabular">{pendingDeliveries}</span>
        </Tile>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Dernière commande</h2>
          <Link href="/espace/commandes" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
            Toutes <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        {lastOrder ? (
          <Link href={`/espace/commandes/${lastOrder.id}`} className="mt-3 flex items-center justify-between gap-4 rounded-md p-2 -m-2 hover:bg-muted">
            <div>
              <p className="font-medium">{lastOrder.orderNumber}</p>
              <p className="text-sm text-muted-foreground">{fmtDate(lastOrder.createdAt)}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusPill status={lastOrder.status} />
              <Money value={lastOrder.total} className="text-xl" />
            </div>
          </Link>
        ) : (
          <p className="mt-3 text-muted-foreground">
            Aucune commande.{" "}
            <Link href="/" className="font-semibold text-foreground underline underline-offset-4">
              Voir la boutique
            </Link>
          </p>
        )}
      </Card>
    </div>
  );
}

function Tile({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="press rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <div className="mt-2">{children}</div>
    </Link>
  );
}
