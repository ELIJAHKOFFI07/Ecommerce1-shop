import { getCatalog } from "@/lib/catalog";
import { Catalog } from "./Catalog";

/// Boutique. Les données viennent du cache serveur (lib/catalog.ts) ;
/// recherche et catégories se font ensuite dans le navigateur, sans
/// requête — le clic sur une catégorie est instantané.
export default async function ShopPage({ searchParams }: { searchParams: Promise<{ q?: string; categorie?: string }> }) {
  const [{ products, categories }, sp] = await Promise.all([getCatalog(), searchParams]);
  return <Catalog products={products} categories={categories} initialQuery={sp.q ?? ""} initialCategory={sp.categorie ?? ""} />;
}
