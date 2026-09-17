import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { PageTitle } from "@/components/ui";
import { ProductForm } from "../ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const { canEdit } = await pageModule("products");
  if (!canEdit) redirect("/admin/produits");
  const categories = await db.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/produits" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Produits
      </Link>
      <PageTitle title="Nouveau produit" />
      <ProductForm categories={categories} />
    </div>
  );
}
