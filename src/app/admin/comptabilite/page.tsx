import Link from "next/link";
import { pageModule } from "@/lib/pageAuth";
import { monthRange, summary, monthly, ledger } from "@/lib/accounting";
import { Card, Empty, Money, PageTitle, StatusPill, fmtDate, ButtonLink } from "@/components/ui";
import { Table, td } from "@/components/admin";
import { MonthPicker } from "./MonthPicker";

export const dynamic = "force-dynamic";

/// Comptabilité : le mois en cours en chiffres, l'historique mensuel, le
/// grand livre. Tout vient des tables métier ; rien n'est saisi ici.
export default async function AccountingPage({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  await pageModule("wallet");
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
            <ButtonLink href={`/api/admin/accounting?format=csv&what=ledger&month=${ym}`} variant="secondary" size="sm">
              Export mouvements (CSV)
            </ButtonLink>
            <ButtonLink href="/api/admin/accounting?format=csv&what=monthly" variant="secondary" size="sm">
              Export mensuel (CSV)
            </ButtonLink>
          </div>
        }
      />

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Ventes du mois (commandes validées)</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Commandes validées" value={String(s.sales.count)} />
        <Kpi label="Ventes HT" value={<Money value={s.sales.subTotal} className="text-3xl" />} />
        <Kpi label="TVA facturée" value={<Money value={s.sales.tax} className="text-3xl" />} />
        <Kpi label="Total TTC" value={<Money value={s.sales.total} className="text-3xl" />} strong />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Encaissements et portefeuilles du mois</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={`TVA encaissée (${s.taxCollected.count} retrait${s.taxCollected.count > 1 ? "s" : ""})`} value={<Money value={s.taxCollected.amount} className="text-3xl" />} />
        <Kpi label={`Crédits distribués (${s.credits.count})`} value={<Money value={s.credits.amount} className="text-3xl" />} />
        <Kpi label={`Transferts entre membres (${s.transfers.count})`} value={<Money value={s.transfers.amount} className="text-3xl" />} />
        <Kpi label="Retraits remis" value={String(s.deliveries)} />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Situation actuelle</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Solde général (caisse)" value={<Money value={s.balances.general} className="text-3xl" />} />
        <Kpi label="Solde taxe" value={<Money value={s.balances.tax} className="text-3xl" />} />
        <Kpi label="Total des soldes membres (dette envers les membres)" value={<Money value={s.balances.members} className="text-3xl" />} />
      </div>

      <h2 className="mb-3 mt-10 font-semibold">Douze derniers mois</h2>
      {m.length === 0 ? (
        <Empty title="Aucune vente validée sur la période" />
      ) : (
        <Table head={["Mois", "Commandes", "Ventes HT", "TVA facturée", "Total TTC", "TVA encaissée"]}>
          {m.map((r) => (
            <tr key={r.ym} className="hover:bg-muted">
              <td className={td}>
                <Link href={`/admin/comptabilite?mois=${r.ym}`} className="font-semibold underline-offset-4 hover:underline">
                  {r.ym}
                </Link>
              </td>
              <td className={`${td} tabular`}>{r.count}</td>
              <td className={td}><Money value={r.total - r.tax} /></td>
              <td className={td}><Money value={r.tax} /></td>
              <td className={td}><Money value={r.total} className="text-lg" /></td>
              <td className={td}><Money value={r.taxCollected} /></td>
            </tr>
          ))}
        </Table>
      )}

      <h2 className="mb-3 mt-10 font-semibold">Grand livre — {label}</h2>
      {l.length === 0 ? (
        <Empty title="Aucun mouvement ce mois" />
      ) : (
        <Table head={["Date", "Type", "Membre", "Description", "Par", "Montant"]}>
          {l.map((t) => {
            const amt = Number(t.amount);
            return (
              <tr key={t.id}>
                <td className={`${td} whitespace-nowrap text-sm`}>{fmtDate(t.createdAt, true)}</td>
                <td className={td}><StatusPill status={t.type} /></td>
                <td className={`${td} text-sm`}>{t.user ? `${t.user.name} (${t.user.memberNumber})` : <span className="text-muted-foreground">Caisse</span>}</td>
                <td className={`${td} max-w-sm truncate text-sm`}>{t.description ?? "—"}</td>
                <td className={`${td} text-sm text-muted-foreground`}>{t.admin?.name ?? "—"}</td>
                <td className={`${td} text-right`}><Money value={Math.abs(amt)} className={amt < 0 ? "text-destructive" : "text-success"} /></td>
              </tr>
            );
          })}
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
