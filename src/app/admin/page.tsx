import Link from "next/link";
import { db } from "@/lib/db";
import { pageStaff } from "@/lib/pageAuth";
import { Card, Money, PageTitle, Alert, ButtonLink } from "@/components/ui";
import { visibleModules } from "@/lib/pageAuth";

export const dynamic = "force-dynamic";

/// Tableau de bord : ce qui attend une action en premier, les chiffres
/// ensuite. Chaque tuile mène à la liste correspondante.
export default async function AdminHome({ searchParams }: { searchParams: Promise<{ refus?: string }> }) {
  const user = await pageStaff();
  const mods = await visibleModules(user);
  const { refus } = await searchParams;
  // Composant serveur : lire l'heure au rendu est exactement ce qu'on veut
  // (la règle vise les composants client re-rendus).
  // eslint-disable-next-line react-hooks/purity
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [pendingOrders, pendingDeliveries, approvedDeliveries, members, validated30, revenue30, lowStock, settings] = await Promise.all([
    db.order.count({ where: { status: "PENDING" } }),
    db.delivery.count({ where: { status: "PENDING" } }),
    db.delivery.count({ where: { status: "APPROVED" } }),
    db.user.count({ where: { role: "CLIENT" } }),
    db.order.count({ where: { status: "VALIDATED", validatedAt: { gte: since30 } } }),
    db.order.aggregate({ where: { status: { in: ["VALIDATED", "DELIVERED"] }, validatedAt: { gte: since30 } }, _sum: { total: true } }),
    db.$queryRaw<{ id: string; title: string; stockDisponible: number; stockBureau: number }[]>`
      SELECT "id","title","stockDisponible","stockBureau" FROM "Product" WHERE "active" AND "stockDisponible" <= "lowStockAlert" ORDER BY "stockDisponible" ASC LIMIT 8`,
    db.settings.findUnique({ where: { id: 1 }, select: { generalBalance: true, taxBalance: true } }),
  ]);

  return (
    <>
      <PageTitle title="Tableau de bord" subtitle={`Bonjour, ${user.name?.split(" ")[0] ?? ""}`} />
      {refus && <div className="mb-6"><Alert tone="error">Vous n’avez pas accès à ce module.</Alert></div>}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Actions rapides</h2>
      <div className="mb-10 flex flex-wrap gap-3">
        {mods.has("products") && <ButtonLink href="/admin/produits/nouveau">+ Ajouter un produit</ButtonLink>}
        {mods.has("stock") && <ButtonLink href="/admin/stock/actions?onglet=ajouter" variant="secondary">+ Ajouter du stock</ButtonLink>}
        {mods.has("users") && <ButtonLink href="/admin/membres/nouveau" variant="secondary">+ Créer un utilisateur</ButtonLink>}
        {mods.has("users") && <ButtonLink href="/admin/membres" variant="secondary">Gérer les utilisateurs et rôles</ButtonLink>}
        {mods.has("orders") && <ButtonLink href="/admin/commandes?status=PENDING" variant="secondary">Vérifier les reçus</ButtonLink>}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">À traiter</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile href="/admin/commandes?status=PENDING" label="Reçus à vérifier" value={pendingOrders} urgent={pendingOrders > 0} />
        <Tile href="/admin/retraits?status=PENDING" label="Retraits à approuver" value={pendingDeliveries} urgent={pendingDeliveries > 0} />
        <Tile href="/admin/retraits?status=APPROVED" label="Retraits à remettre" value={approvedDeliveries} />
      </div>

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">30 derniers jours</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-semibold text-muted-foreground">Commandes validées</p>
          <p className="font-display mt-1 text-4xl font-semibold tabular">{validated30}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-muted-foreground">Montant validé</p>
          <Money value={revenue30._sum.total ?? 0} className="mt-1 block text-4xl" />
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-muted-foreground">Membres</p>
          <p className="font-display mt-1 text-4xl font-semibold tabular">{members}</p>
        </Card>
      </div>

      {settings && (
        <>
          <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Caisse</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/admin/portefeuilles/general" className="press rounded-lg border border-border bg-card p-5 hover:bg-muted">
              <p className="text-sm font-semibold text-muted-foreground">Solde général</p>
              <Money value={settings.generalBalance} className="mt-1 block text-4xl" />
            </Link>
            <Link href="/admin/portefeuilles/general" className="press rounded-lg border border-border bg-card p-5 hover:bg-muted">
              <p className="text-sm font-semibold text-muted-foreground">Solde taxe</p>
              <Money value={settings.taxBalance} className="mt-1 block text-4xl" />
            </Link>
          </div>
        </>
      )}

      {lowStock.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Stock bas</h2>
          <Card className="divide-y divide-border">
            {lowStock.map((p) => (
              <Link key={p.id} href={`/admin/produits/${p.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-muted">
                <span className="font-medium">{p.title}</span>
                <span className="text-sm text-muted-foreground">
                  disponible <strong className="tabular text-warning">{p.stockDisponible}</strong> · bureau <strong className="tabular">{p.stockBureau}</strong>
                </span>
              </Link>
            ))}
          </Card>
        </>
      )}
    </>
  );
}

function Tile({ href, label, value, urgent }: { href: string; label: string; value: number; urgent?: boolean }) {
  return (
    <Link href={href} className={`press rounded-lg border p-5 transition-colors hover:bg-muted ${urgent ? "border-accent bg-amber-50/60" : "border-border bg-card"}`}>
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className={`font-display mt-1 text-4xl font-semibold tabular ${urgent ? "text-accent" : ""}`}>{value}</p>
    </Link>
  );
}
