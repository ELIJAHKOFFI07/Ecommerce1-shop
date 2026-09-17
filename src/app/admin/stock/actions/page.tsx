import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { PageTitle } from "@/components/ui";
import { StockActions } from "./StockActions";

export const dynamic = "force-dynamic";

export default async function StockActionsPage({ searchParams }: { searchParams: Promise<{ produit?: string; onglet?: string }> }) {
  const { canEdit } = await pageModule("stock");
  if (!canEdit) redirect("/admin/stock");
  const { produit, onglet } = await searchParams;
  const products = await db.product.findMany({ select: { id: true, title: true, sku: true, stockVirtuel: true, stockDisponible: true, stockBureau: true, stockEntrepot: true }, orderBy: { title: "asc" } });
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={onglet === "ajouter" ? "Ajouter ou retirer du stock" : "Transférer du stock"} subtitle="Chaque mouvement est enregistré dans l’historique." />
      <StockActions products={products} initialProductId={produit} initialTab={onglet === "ajouter" ? "adjust" : "transfer"} />
    </div>
  );
}
