import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { PageTitle } from "@/components/ui";
import { SupplyManager } from "./SupplyManager";

export const dynamic = "force-dynamic";

export default async function SupplyPage() {
  const { canEdit } = await pageModule("stock");
  const [orders, products] = await Promise.all([
    db.supplyOrder.findMany({
      select: { id: true, quantity: true, quantityBureau: true, quantityEntrepot: true, status: true, note: true, createdAt: true, receivedAt: true, product: { select: { id: true, title: true } }, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.product.findMany({ where: { active: true }, select: { id: true, title: true, sku: true }, orderBy: { title: "asc" } }),
  ]);
  return (
    <>
      <Link href="/admin/stock" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Stock
      </Link>
      <PageTitle title="Commandes fournisseur" subtitle="À la commande, le stock virtuel augmente. À la réception, vous répartissez entre bureau et entrepôt." />
      <SupplyManager orders={orders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString(), receivedAt: o.receivedAt?.toISOString() ?? null }))} products={products} canEdit={canEdit} />
    </>
  );
}
