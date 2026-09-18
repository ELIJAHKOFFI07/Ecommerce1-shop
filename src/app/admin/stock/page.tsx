import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { ButtonLink, Empty, PageTitle } from "@/components/ui";
import { FilterTabs, SearchBox, Table, td } from "@/components/admin";

export const dynamic = "force-dynamic";

/// Le stock en un tableau. Les actions (ajouter/retirer, historique)
/// sont des boutons en haut, pas un sous-menu.
export default async function StockPage({ searchParams }: { searchParams: Promise<{ q?: string; filtre?: string }> }) {
  const { canEdit } = await pageModule("stock");
  const { q, filtre } = await searchParams;
  const query = q?.trim().slice(0, 80);
  const all = await db.product.findMany({
    where: query ? { OR: [{ title: { contains: query, mode: "insensitive" } }, { sku: { contains: query, mode: "insensitive" } }] } : {},
    select: { id: true, sku: true, title: true, active: true, stock: true, lowStockAlert: true, images: true },
    orderBy: { title: "asc" },
    take: 500,
  });
  const products = filtre === "bas" ? all.filter((p) => p.stock <= p.lowStockAlert) : filtre === "rupture" ? all.filter((p) => p.stock <= 0) : all;

  return (
    <>
      <PageTitle
        title="Stock"
        subtitle={`${all.filter((p) => p.stock <= p.lowStockAlert).length} produit(s) sous le seuil d’alerte`}
        action={
          <div className="flex flex-wrap gap-2">
            {canEdit && <ButtonLink href="/admin/stock/ajuster">+ Ajouter ou retirer du stock</ButtonLink>}
            <ButtonLink href="/admin/stock/mouvements" variant="secondary">Historique</ButtonLink>
          </div>
        }
      />
      <div className="mb-5 space-y-3">
        <Suspense>
          <SearchBox placeholder="Nom ou référence" />
          <FilterTabs param="filtre" options={[{ value: "", label: "Tout" }, { value: "bas", label: "Stock bas" }, { value: "rupture", label: "Rupture" }]} />
        </Suspense>
      </div>
      {products.length === 0 ? (
        <Empty title="Aucun produit" />
      ) : (
        <Table head={["Produit", "Seuil d’alerte", "En stock", ""]}>
          {products.map((p) => (
            <tr key={p.id} className={`hover:bg-muted ${p.active ? "" : "opacity-60"}`}>
              <td className={td}>
                <Link href={`/admin/produits/${p.id}`} className="flex items-center gap-3 font-semibold underline-offset-4 hover:underline">
                  <span className="scene relative h-10 w-10 shrink-0 overflow-hidden rounded-md p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.images[0] ? <img src={p.images[0]} alt="" className="relative z-10 h-full w-full object-contain" /> : null}
                  </span>
                  <span>
                    {p.title}
                    <span className="block font-mono text-xs font-normal text-muted-foreground">{p.sku}</span>
                  </span>
                </Link>
              </td>
              <td className={`${td} tabular text-muted-foreground`}>{p.lowStockAlert}</td>
              <td className={`${td} tabular text-2xl ${p.stock <= 0 ? "font-semibold text-destructive" : p.stock <= p.lowStockAlert ? "font-semibold text-warning" : ""}`}>{p.stock}</td>
              <td className={`${td} text-right`}>{canEdit && <Link href={`/admin/stock/ajuster?produit=${p.id}`} className="text-sm font-semibold underline-offset-4 hover:underline">Ajuster</Link>}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
