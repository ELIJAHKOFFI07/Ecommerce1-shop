import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { pageStaff } from "@/lib/pageAuth";
import { Card, Empty, Money, PageTitle, StatusPill, fmtDate } from "@/components/ui";
import { GeneralForms } from "./GeneralForms";

export const dynamic = "force-dynamic";

/// Réservé au SUPER_ADMIN : alimenter la caisse, basculer la taxe.
export default async function GeneralBalancePage() {
  const user = await pageStaff();
  if (user.role !== "SUPER_ADMIN") redirect("/admin/portefeuilles");
  const [settings, transactions] = await Promise.all([
    db.settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {}, select: { generalBalance: true, taxBalance: true } }),
    db.walletTransaction.findMany({ where: { userId: null }, select: { id: true, amount: true, type: true, description: true, createdAt: true, admin: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  return (
    <div className="space-y-6">
      <Link href="/admin/portefeuilles" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Portefeuilles
      </Link>
      <PageTitle title="Caisse" subtitle="Le solde général alimente les portefeuilles des membres. Le solde taxe reçoit la TVA encaissée." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm font-semibold text-muted-foreground">Solde général</p>
          <Money value={settings.generalBalance} className="mt-1 block text-4xl" />
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-muted-foreground">Solde taxe</p>
          <Money value={settings.taxBalance} className="mt-1 block text-4xl" />
        </Card>
      </div>
      <GeneralForms taxBalance={Number(settings.taxBalance)} generalBalance={Number(settings.generalBalance)} />
      <h2 className="font-semibold">Mouvements de caisse</h2>
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
                  <p className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                    {fmtDate(t.createdAt, true)} <StatusPill status={t.type} /> {t.admin && <span>par {t.admin.name}</span>}
                  </p>
                </div>
                <Money value={Math.abs(amt)} className={`shrink-0 text-xl ${amt < 0 ? "text-destructive" : "text-success"}`} />
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
