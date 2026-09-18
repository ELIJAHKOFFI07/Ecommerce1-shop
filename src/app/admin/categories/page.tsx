import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { PageTitle } from "@/components/ui";
import { CategoriesManager } from "./CategoriesManager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const { canEdit } = await pageModule("categories");
  const categories = await db.category.findMany({ select: { id: true, name: true, slug: true, image: true, position: true, _count: { select: { products: true } } }, orderBy: [{ position: "asc" }, { name: "asc" }] });
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Catégories" subtitle="Peu de catégories, bien nommées : le client doit s’y retrouver d’un coup d’œil." />
      <CategoriesManager categories={categories} canEdit={canEdit} />
    </div>
  );
}
