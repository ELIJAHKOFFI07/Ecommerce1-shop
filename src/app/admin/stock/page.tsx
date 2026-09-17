import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { ButtonLink, Empty, PageTitle } from "@/components/ui";
import { SearchBox, Table, td } from "@/components/admin";

export const dynamic = "force-dynamic";

/// Le stock en un tableau : les quatre niveaux par produit. Les trois
/// écrans d'action (réappro, transfert/ajustement, mouvements) sont des
/// boutons en haut, pas un sous-menu.
export default async function StockPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { canEdit } = await pageModule("stock");
  const { q } = await searchParams;
  const query = q?.trim().slice(0, 80);
  const products = await db.product.findMany({
    where: query ? { OR: [{ title: { contains: query, mode: "insensitive" } }, { sku: { contains: query, mode: "insensitive" } }] } : {},
    select: { id: true, sku: true, title: true, active: true, stockVirtuel: true, stockDisponible: true, stockBureau: true, stockEntrepot: true, lowStockAlert: true },
    orderBy: { title: "asc" },
    take: 300,
  });

  return (
    <>
      <PageTitle
        title="Stock"
        action={
          canEdit ? (
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/admin/stock/reappro">Commande fournisseur</ButtonLink>
              <ButtonLink href="/admin/stock/actions" variant="secondary">
                Transfert / ajustement
              </ButtonLink>
              <ButtonLink href="/admin/stock/mouvements" variant="ghost">
                Historique
              </ButtonLink>
            </div>
          ) : (
            <ButtonLink href="/admin/stock/mouvements" variant="secondary">
              Historique
            </ButtonLink>
          )
        }
      />
      <div className="mb-5">
        <Suspense>
          <SearchBox placeholder="Nom ou référence" />
        </Suspense>
      </div>
      {products.length === 0 ? (
        <Empty title="Aucun produit" />
      ) : (
        <Table head={["Produit", "Virtuel", "Disponible", "Bureau", "Entrepôt"]}>
          {products.map((p) => (
            <tr key={p.id} className={`hover:bg-muted ${p.active ? "" : "opacity-60"}`}>
              <td className={td}>
                <Link href={`/admin/produits/${p.id}`} className="font-semibold underline-offset-4 hover:underline">
                  {p.title}
                </Link>
                <div className="font-mono text-xs text-muted-foreground">{p.sku}</div>
              </td>
              <Cell v={p.stockVirtuel} />
              <Cell v={p.stockDisponible} low={p.lowStockAlert} />
              <Cell v={p.stockBureau} />
              <Cell v={p.stockEntrepot} />
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}

function Cell({ v, low }: { v: number; low?: number }) {
  return <td className={`${td} tabular text-lg ${v < 0 ? "font-semibold text-destructive" : low !== undefined && v <= low ? "font-semibold text-warning" : ""}`}>{v}</td>;
}
