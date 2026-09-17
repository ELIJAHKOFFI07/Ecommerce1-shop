import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { uuid } from "@/lib/validators";
import { Card, Empty, Money, PageTitle, StatusPill, fmtDate } from "@/components/ui";
import { CreditForm } from "./CreditForm";

export const dynamic = "force-dynamic";

export default async function WalletDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { canEdit } = await pageModule("wallet");
  const parsed = uuid.safeParse((await params).userId);
  if (!parsed.success) notFound();
  const [user, transactions, settings] = await Promise.all([
    db.user.findUnique({ where: { id: parsed.data }, select: { id: true, name: true, memberNumber: true, email: true, blocked: true, wallet: { select: { balance: true } } } }),
    db.walletTransaction.findMany({
      where: { userId: parsed.data },
      select: { id: true, amount: true, type: true, description: true, paymentMethod: true, proofUrl: true, createdAt: true, admin: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.settings.findUnique({ where: { id: 1 }, select: { generalBalance: true } }),
  ]);
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <PageTitle title={user.name} subtitle={`${user.memberNumber} · ${user.email}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card className="p-6">
            <p className="text-sm font-semibold text-muted-foreground">Solde</p>
            <Money value={user.wallet?.balance ?? 0} className="mt-1 block text-5xl" />
          </Card>
          <h2 className="font-semibold">Historique</h2>
          {transactions.length === 0 ? (
            <Empty title="Aucun mouvement" />
          ) : (
            <Card className="divide-y divide-border">
              {transactions.map((t) => {
                const amt = Number(t.amount);
                return (
                  <div key={t.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.description ?? "—"}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {fmtDate(t.createdAt, true)} <StatusPill status={t.type} />
                        {t.admin && <span>par {t.admin.name}</span>}
                        {t.paymentMethod && <span>· {t.paymentMethod}</span>}
                        {t.proofUrl && (
                          <a href={t.proofUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                            preuve
                          </a>
                        )}
                      </p>
                    </div>
                    <Money value={Math.abs(amt)} className={`shrink-0 text-xl ${amt < 0 ? "text-destructive" : "text-success"}`} />
                  </div>
                );
              })}
            </Card>
          )}
        </div>
        {canEdit && !user.blocked && <CreditForm userId={user.id} generalBalance={Number(settings?.generalBalance ?? 0)} />}
      </div>
    </div>
  );
}
