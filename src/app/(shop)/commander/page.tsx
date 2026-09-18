import { db } from "@/lib/db";
import { pageUser } from "@/lib/pageAuth";
import { PageTitle } from "@/components/ui";
import { CheckoutForm } from "./CheckoutForm";

/// Commander : adresse (carnet ou nouvelle), moyen de paiement, récapitulatif.
export default async function CheckoutPage() {
  const me = await pageUser("/commander");
  const [user, addresses, settings] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: me.id }, select: { name: true, phone: true } }),
    db.address.findMany({ where: { userId: me.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
    db.settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {}, select: { shippingFee: true, freeShippingThreshold: true, mobileMoneyNumber: true, mobileMoneyName: true } }),
  ]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title="Commander" subtitle="Où livrer, comment payer — et c’est tout." />
      <CheckoutForm
        addresses={addresses.map((a) => ({ id: a.id, label: a.label, fullName: a.fullName, phone: a.phone, city: a.city, commune: a.commune, details: a.details }))}
        defaults={{ fullName: user.name, phone: user.phone ?? "" }}
        shipping={{ fee: Number(settings.shippingFee), freeFrom: settings.freeShippingThreshold ? Number(settings.freeShippingThreshold) : null }}
        mobileMoney={settings.mobileMoneyNumber ? { number: settings.mobileMoneyNumber, name: settings.mobileMoneyName ?? "" } : null}
      />
    </div>
  );
}
