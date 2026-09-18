import Link from "next/link";
import { pageModule } from "@/lib/pageAuth";
import { monthRange, summary, monthly, ledger } from "@/lib/accounting";
import { Card, Empty, Money, PageTitle, StatusPill, fmtDate, ButtonLink } from "@/components/ui";
import { Table, td } from "@/components/admin";
import { MonthPicker } from "./MonthPicker";

export const dynamic = "force-dynamic";

/// Comptabilité : le mois en chiffres (ventes = commandes livrées),
/// l'historique mensuel, le journal des commandes. Rien n'est saisi ici.
export default async function AccountingPage({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  await pageModule("accounting");
  const { mois } = await searchParams;
  const period = monthRange(mois);
  const ym = `${period.from.getFullYear()}-${String(period.from.getMonth() + 1).padStart(2, "0")}`;
  const label = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(period.from);
  const [s, m, l] = await Promise.all([summary(period), monthly(12), ledger(period, 200)]);

  return (
    <>
      <PageTitle
        title="Comptabilité"
        subtitle={label.charAt(0).toUpperCase() + label.slice(1)}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <MonthPicker value={ym} />
            <ButtonLink href={`/api/admin/accounting?format=csv&what=ledger&month=${ym}`} variant="secondary" size="sm">Export commandes (CSV)</ButtonLink>
            <ButtonLink href="/api/admin/accounting?format=csv&what=monthly" variant="secondary" size="sm">Export mensuel (CSV)</ButtonLink>
          </div>
        }
      />

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Ventes du mois (commandes livrées)</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Commandes livrées" value={String(s.sales.count)} />
        <Kpi label="Articles vendus" value={String(s.sales.items)} />
        <Kpi label="Frais de livraison" value={<Money value={s.sales.shipping} className="text-3xl" />} />
        <Kpi label="Chiffre d’affaires" value={<Money value={s.sales.total} className="text-3xl" />} strong />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">En ce moment</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label={`Commandes en cours (${s.inProgress.count})`} value={<Money value={s.inProgress.total} className="text-3xl" />} />
        <Kpi label="Mobile Money à vérifier" value={String(s.unpaidMobile)} />
        <Kpi label="Annulées ce mois" value={String(s.cancelled)} />
      </div>

      {s.topProducts.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 font-semibold">Meilleures ventes — {label}</h2>
          <Table head={["Produit", "Quantité", "Montant"]}>
            {s.topProducts.map((t) => (
              <tr key={t.productId}>
                <td className={td}><Link href={`/admin/produits/${t.productId}`} className="font-medium underline-offset-4 hover:underline">{t.title}</Link></td>
                <td className={`${td} tabular`}>{t.quantity}</td>
                <td className={td}><Money value={t.total} /></td>
              </tr>
            ))}
          </Table>
        </>
      )}

      <h2 className="mb-3 mt-10 font-semibold">Douze derniers mois</h2>
      {m.length === 0 ? (
        <Empty title="Aucune vente livrée sur la période" />
      ) : (
        <Table head={["Mois", "Commandes", "Livraison", "Chiffre d’affaires"]}>
          {m.map((r) => (
            <tr key={r.ym} className="hover:bg-muted">
              <td className={td}><Link href={`/admin/comptabilite?mois=${r.ym}`} className="font-semibold underline-offset-4 hover:underline">{r.ym}</Link></td>
              <td className={`${td} tabular`}>{r.count}</td>
              <td className={td}><Money value={r.shipping} /></td>
              <td className={td}><Money value={r.total} className="text-lg" /></td>
            </tr>
          ))}
        </Table>
      )}

      <h2 className="mb-3 mt-10 font-semibold">Commandes — {label}</h2>
      {l.length === 0 ? (
        <Empty title="Aucune commande ce mois" />
      ) : (
        <Table head={["Date", "Commande", "Client", "Statut", "Paiement", "Montant"]}>
          {l.map((o) => (
            <tr key={o.id}>
              <td className={`${td} whitespace-nowrap text-sm`}>{fmtDate(o.createdAt)}</td>
              <td className={td}><Link href={`/admin/commandes/${o.id}`} className="font-semibold underline-offset-4 hover:underline">{o.orderNumber}</Link></td>
              <td className={`${td} text-sm`}>{o.user.name}</td>
              <td className={td}><StatusPill status={o.status} /></td>
              <td className={td}><StatusPill status={o.paymentStatus} /></td>
              <td className={`${td} text-right`}><Money value={o.total} /></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}

function Kpi({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <Card className={`p-5 ${strong ? "border-primary" : ""}`}>
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <div className="font-display mt-1 text-3xl font-semibold tabular">{value}</div>
    </Card>
  );
}
