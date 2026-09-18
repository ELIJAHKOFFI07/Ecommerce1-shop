import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { ButtonLink, Empty, Money, PageTitle } from "@/components/ui";
import { Pagination, SearchBox, Table, td } from "@/components/admin";

export const dynamic = "force-dynamic";
const LIMIT = 50;

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { canEdit } = await pageModule("products");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);
  const where = q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { sku: { contains: q, mode: "insensitive" as const } }] } : {};
  const [items, total] = await Promise.all([
    db.product.findMany({ where, select: { id: true, sku: true, title: true, price: true, compareAtPrice: true, images: true, active: true, featured: true, stock: true, lowStockAlert: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * LIMIT, take: LIMIT }),
    db.product.count({ where }),
  ]);

  return (
    <>
      <PageTitle title="Produits" subtitle={`${total} au total`} action={canEdit ? <ButtonLink href="/admin/produits/nouveau">Ajouter un produit</ButtonLink> : undefined} />
      <div className="mb-5">
        <Suspense>
          <SearchBox placeholder="Nom ou référence" />
        </Suspense>
      </div>
      {items.length === 0 ? (
        <Empty title="Aucun produit" action={canEdit ? <ButtonLink href="/admin/produits/nouveau">Ajouter un produit</ButtonLink> : undefined} />
      ) : (
        <Table head={["Produit", "Référence", "Prix", "Stock", "État"]}>
          {items.map((p) => (
            <tr key={p.id} className="hover:bg-muted">
              <td className={td}>
                <Link href={`/admin/produits/${p.id}`} className="flex items-center gap-3 font-semibold underline-offset-4 hover:underline">
                  <span className="scene relative h-10 w-10 shrink-0 overflow-hidden rounded-md p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.images[0] ? <img src={p.images[0]} alt="" className="relative z-10 h-full w-full object-contain" /> : null}
                  </span>
                  {p.title}
                </Link>
              </td>
              <td className={`${td} font-mono text-sm`}>{p.sku}</td>
              <td className={td}>
                <Money value={p.price} />
              </td>
              <td className={`${td} tabular text-lg ${p.stock <= 0 ? "font-semibold text-destructive" : p.stock <= p.lowStockAlert ? "font-semibold text-warning" : ""}`}>{p.stock}</td>
              <td className={`${td} text-sm`}>
                {p.active ? <span className="text-success">En vente</span> : <span className="text-muted-foreground">Retiré</span>}
                {p.featured && <div className="text-xs text-accent">À la une</div>}
                {p.compareAtPrice && <div className="text-xs text-accent">Promo</div>}
              </td>
            </tr>
          ))}
        </Table>
      )}
      <Suspense>
        <Pagination page={page} pages={Math.ceil(total / LIMIT)} />
      </Suspense>
    </>
  );
}
