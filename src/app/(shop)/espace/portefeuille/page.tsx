import { db } from "@/lib/db";
import { pageUser } from "@/lib/pageAuth";
import { Card, Empty, Money, PageTitle, StatusPill, fmtDate } from "@/components/ui";
import { TransferDialog } from "./TransferDialog";

export const dynamic = "force-dynamic";

/// Solde en gros, un bouton « Envoyer », l'historique. Le solde ne peut
/// être alimenté que par l'administration — on le dit clairement.
export default async function WalletPage() {
  const me = await pageUser("/espace/portefeuille");
  const [wallet, transactions] = await Promise.all([
    db.wallet.findUnique({ where: { userId: me.id }, select: { balance: true } }),
    db.walletTransaction.findMany({ where: { userId: me.id }, select: { id: true, amount: true, type: true, description: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const balance = Number(wallet?.balance ?? 0);

  return (
    <>
      <PageTitle title="Mon solde" />
      <Card className="p-6 sm:p-8">
        <p className="text-sm font-semibold text-muted-foreground">Solde disponible</p>
        <Money value={balance} className="mt-1 block text-5xl lg:text-6xl" />
        <p className="mt-3 text-sm text-muted-foreground">Ce solde sert à régler vos taxes et frais. Il est alimenté par l’administration.</p>
        <div className="mt-6">
          <TransferDialog balance={balance} />
        </div>
      </Card>

      <h2 className="mb-3 mt-8 font-semibold">Historique</h2>
      {transactions.length === 0 ? (
        <Empty title="Aucun mouvement" />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {transactions.map((t) => {
            const amt = Number(t.amount);
            return (
              <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.description ?? "—"}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                    {fmtDate(t.createdAt, true)} <StatusPill status={t.type} />
                  </p>
                </div>
                <Money value={Math.abs(amt)} className={`shrink-0 text-xl ${amt < 0 ? "text-destructive" : "text-success"}`} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
