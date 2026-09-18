import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { PageTitle } from "@/components/ui";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { canEdit } = await pageModule("settings");
  const s = await db.settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {}, select: { siteName: true, siteEmail: true, sitePhone: true, siteAddress: true, shippingFee: true, freeShippingThreshold: true, mobileMoneyNumber: true, mobileMoneyName: true } });
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Paramètres" subtitle="Coordonnées, frais de livraison, numéro Mobile Money." />
      <SettingsForm
        initial={{ siteName: s.siteName, siteEmail: s.siteEmail ?? "", sitePhone: s.sitePhone ?? "", siteAddress: s.siteAddress ?? "", shippingFee: Number(s.shippingFee), freeShippingThreshold: s.freeShippingThreshold ? String(Number(s.freeShippingThreshold)) : "", mobileMoneyNumber: s.mobileMoneyNumber ?? "", mobileMoneyName: s.mobileMoneyName ?? "" }}
        canEdit={canEdit}
      />
    </div>
  );
}
