import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { PageTitle } from "@/components/ui";
import { AdjustForm } from "./AdjustForm";

export const dynamic = "force-dynamic";

export default async function AdjustStockPage({ searchParams }: { searchParams: Promise<{ produit?: string }> }) {
  await pageModule("stock", "edit");
  const { produit } = await searchParams;
  const products = await db.product.findMany({ select: { id: true, title: true, sku: true, stock: true }, orderBy: { title: "asc" }, take: 1000 });
  return (
    <div className="mx-auto max-w-xl">
      <PageTitle title="Ajouter ou retirer du stock" subtitle="Réception d’une livraison, retour client, casse, inventaire." />
      <AdjustForm products={products} initialProductId={produit ?? ""} />
    </div>
  );
}
