import { db } from "@/lib/db";
import { pageUser } from "@/lib/pageAuth";
import { ButtonLink, Empty, PageTitle } from "@/components/ui";
import { NewDeliveryForm } from "./NewDeliveryForm";

export const dynamic = "force-dynamic";

export default async function NewDeliveryPage() {
  const me = await pageUser("/espace/retraits/nouveau");
  const [stocks, user] = await Promise.all([
    db.userStock.findMany({ where: { userId: me.id, quantity: { gt: 0 } }, select: { quantity: true, product: { select: { id: true, title: true, images: true } } }, orderBy: { updatedAt: "desc" } }),
    db.user.findUniqueOrThrow({ where: { id: me.id }, select: { name: true, phone: true } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Demander un retrait" subtitle="Choisissez les quantités à retirer au bureau." />
      {stocks.length === 0 ? (
        <Empty title="Rien à retirer" hint="Votre stock est vide." action={<ButtonLink href="/">Voir la boutique</ButtonLink>} />
      ) : (
        <NewDeliveryForm stocks={stocks.map((s) => ({ productId: s.product.id, title: s.product.title, image: s.product.images[0], available: s.quantity }))} defaultName={user.name} defaultPhone={user.phone ?? ""} />
      )}
    </div>
  );
}
