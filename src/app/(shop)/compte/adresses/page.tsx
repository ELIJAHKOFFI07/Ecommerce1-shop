import { db } from "@/lib/db";
import { pageUser } from "@/lib/pageAuth";
import { PageTitle } from "@/components/ui";
import { AddressBook } from "./AddressBook";

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const me = await pageUser("/compte/adresses");
  const addresses = await db.address.findMany({ where: { userId: me.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Mes adresses" subtitle="Elles sont proposées au moment de commander." />
      <AddressBook addresses={addresses.map((a) => ({ id: a.id, label: a.label, fullName: a.fullName, phone: a.phone, city: a.city, commune: a.commune, details: a.details, isDefault: a.isDefault }))} />
    </div>
  );
}
