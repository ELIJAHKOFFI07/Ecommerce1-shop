import Link from "next/link";
import { db } from "@/lib/db";
import { pageStaff, visibleModules } from "@/lib/pageAuth";
import { Card, Money, PageTitle, Alert, ButtonLink } from "@/components/ui";

export const dynamic = "force-dynamic";

/// Tableau de bord : ce qui attend une action en premier, les chiffres
/// ensuite. Chaque tuile mène à la liste correspondante.
export default async function AdminHome({ searchParams }: { searchParams: Promise<{ refus?: string }> }) {
  const user = await pageStaff();
  const mods = await visibleModules(user);
  const { refus } = await searchParams;
  // Composant serveur : lire l'heure au rendu est exactement ce qu'on veut.
  // eslint-disable-next-line react-hooks/purity
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [pending, toShip, shipped, unpaidMobile, customers, delivered30, lowStock] = await Promise.all([
    db.order.count({ where: { status: "PENDING" } }),
    db.order.count({ where: { status: "CONFIRMED" } }),
    db.order.count({ where: { status: "SHIPPED" } }),
    db.order.count({ where: { paymentMethod: "MOBILE_MONEY", paymentStatus: "UNPAID", status: { not: "CANCELLED" } } }),
    db.user.count({ where: { role: "CLIENT" } }),
    db.order.aggregate({ where: { status: "DELIVERED", deliveredAt: { gte: since30 } }, _sum: { total: true }, _count: true }),
    db.product.findMany({ where: { active: true }, select: { id: true, title: true, stock: true, lowStockAlert: true }, orderBy: { stock: "asc" }, take: 40 }),
  ]);
  const low = lowStock.filter((p) => p.stock <= p.lowStockAlert).slice(0, 8);

  return (
    <>
      <PageTitle title="Tableau de bord" subtitle={`Bonjour, ${user.name?.split(" ")[0] ?? ""}`} />
      {refus && <div className="mb-6"><Alert tone="error">Vous n’avez pas accès à ce module.</Alert></div>}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Actions rapides</h2>
      <div className="mb-10 flex flex-wrap gap-3">
        {mods.has("orders") && <ButtonLink href="/admin/commandes?status=PENDING">Traiter les commandes</ButtonLink>}
        {mods.has("products") && <ButtonLink href="/admin/produits/nouveau" variant="secondary">+ Ajouter un produit</ButtonLink>}
        {mods.has("stock") && <ButtonLink href="/admin/stock/ajuster" variant="secondary">+ Ajouter du stock</ButtonLink>}
        {mods.has("users") && <ButtonLink href="/admin/utilisateurs/nouveau" variant="secondary">+ Créer un utilisateur</ButtonLink>}
        {mods.has("users") && <ButtonLink href="/admin/utilisateurs" variant="secondary">Gérer les utilisateurs et rôles</ButtonLink>}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">À traiter</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile href="/admin/commandes?status=PENDING" label="Commandes à confirmer" value={pending} urgent={pending > 0} />
        <Tile href="/admin/commandes?status=CONFIRMED" label="À expédier" value={toShip} urgent={toShip > 0} />
        <Tile href="/admin/commandes?status=SHIPPED" label="En livraison" value={shipped} />
        <Tile href="/admin/commandes?paiement=UNPAID" label="Mobile Money à vérifier" value={unpaidMobile} urgent={unpaidMobile > 0} />
      </div>

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">30 derniers jours</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-semibold text-muted-foreground">Commandes livrées</p>
          <p className="font-display mt-1 text-4xl font-semibold tabular">{delivered30._count}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-muted-foreground">Chiffre d’affaires (livré)</p>
          <Money value={delivered30._sum.total ?? 0} className="mt-1 block text-4xl" />
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-muted-foreground">Clients</p>
          <p className="font-display mt-1 text-4xl font-semibold tabular">{customers}</p>
        </Card>
      </div>

      {low.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Stock bas</h2>
          <Card className="divide-y divide-border">
            {low.map((p) => (
              <Link key={p.id} href={`/admin/produits/${p.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-muted">
                <span className="font-medium">{p.title}</span>
                <span className="text-sm text-muted-foreground">
                  reste <strong className={`tabular ${p.stock <= 0 ? "text-destructive" : "text-warning"}`}>{p.stock}</strong>
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
    <Link href={href} className={`press rounded-lg border p-5 transition-colors hover:bg-muted ${urgent ? "border-accent bg-amber-50/60 dark:bg-amber-950/20" : "border-border bg-card"}`}>
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className={`font-display mt-1 text-4xl font-semibold tabular ${urgent ? "text-accent" : ""}`}>{value}</p>
    </Link>
  );
}
