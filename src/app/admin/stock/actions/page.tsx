import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { PageTitle } from "@/components/ui";
import { StockActions } from "./StockActions";

export const dynamic = "force-dynamic";

export default async function StockActionsPage({ searchParams }: { searchParams: Promise<{ produit?: string }> }) {
  const { canEdit } = await pageModule("stock");
  if (!canEdit) redirect("/admin/stock");
  const { produit } = await searchParams;
  const products = await db.product.findMany({ select: { id: true, title: true, sku: true, stockVirtuel: true, stockDisponible: true, stockBureau: true, stockEntrepot: true }, orderBy: { title: "asc" } });
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/stock" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Stock
      </Link>
      <PageTitle title="Transfert et ajustement" />
      <StockActions products={products} initialProductId={produit} />
    </div>
  );
}
