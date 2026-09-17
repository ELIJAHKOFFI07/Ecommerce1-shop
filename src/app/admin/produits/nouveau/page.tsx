import { redirect } from "next/navigation";
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
      <PageTitle title="Nouveau produit" />
      <ProductForm categories={categories} />
    </div>
  );
}
