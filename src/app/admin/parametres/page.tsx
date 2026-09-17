import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { PageTitle } from "@/components/ui";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { canEdit } = await pageModule("settings");
  const s = await db.settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {}, select: { siteName: true, siteEmail: true, sitePhone: true, taxRate: true, allowReceiptSending: true } });
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Paramètres" />
      <SettingsForm initial={{ siteName: s.siteName, siteEmail: s.siteEmail ?? "", sitePhone: s.sitePhone ?? "", taxRate: Number(s.taxRate), allowReceiptSending: s.allowReceiptSending }} canEdit={canEdit} />
    </div>
  );
}
