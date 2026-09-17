import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { uuid } from "@/lib/validators";
import { LOCATION_LABEL } from "@/lib/stock";
import { Card, PageTitle, fmtDate, ButtonLink } from "@/components/ui";
import { Table, td, ActionButton } from "@/components/admin";
import { ProductForm } from "../ProductForm";

export const dynamic = "force-dynamic";

const REASON: Record<string, string> = { RECEPTION: "Réception", SALE: "Vente", RETURN: "Retour", ADJUSTMENT: "Ajustement", TRANSFER: "Transfert", CONVERSION: "Conversion", LOSS: "Perte" };

export default async function AdminProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { canEdit } = await pageModule("products");
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const [p, categories] = await Promise.all([
    db.product.findUnique({
      where: { id: parsed.data },
      select: {
        id: true, sku: true, title: true, description: true, price: true, tva: true, commission: true, images: true, active: true, lowStockAlert: true,
        stockVirtuel: true, stockDisponible: true, stockBureau: true, stockEntrepot: true,
        categories: { select: { id: true } },
        stockMovements: { select: { id: true, location: true, quantity: true, reason: true, note: true, createdAt: true, user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 30 },
      },
    }),
    db.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!p) notFound();

  return (
    <div className="space-y-8">
      <Link href="/admin/produits" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Produits
      </Link>
      <PageTitle title={p.title} subtitle={p.sku} action={canEdit ? <div className="flex flex-wrap gap-2"><ButtonLink href={`/admin/stock/actions?produit=${p.id}`} variant="secondary">Ajuster le stock</ButtonLink><ActionButton path={`/api/admin/products/${p.id}`} method="DELETE" variant="ghost" confirm={`Supprimer « ${p.title} » ? S’il a un historique, il sera seulement retiré de la vente.`} redirect="/admin/produits">Supprimer</ActionButton></div> : undefined} />

      <div className="grid gap-4 sm:grid-cols-4">
        {(["VIRTUEL", "DISPONIBLE", "BUREAU", "ENTREPOT"] as const).map((loc) => {
          const v = { VIRTUEL: p.stockVirtuel, DISPONIBLE: p.stockDisponible, BUREAU: p.stockBureau, ENTREPOT: p.stockEntrepot }[loc];
          return (
            <Card key={loc} className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{LOCATION_LABEL[loc]}</p>
              <p className={`font-display mt-1 text-3xl font-semibold tabular ${v < 0 ? "text-destructive" : v <= p.lowStockAlert ? "text-warning" : ""}`}>{v}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="min-w-0">
          {canEdit ? (
            <ProductForm
              categories={categories}
              initial={{ id: p.id, sku: p.sku, title: p.title, description: p.description ?? "", price: Number(p.price), tva: Number(p.tva), commission: Number(p.commission), images: p.images, active: p.active, lowStockAlert: p.lowStockAlert, categoryIds: p.categories.map((c) => c.id) }}
            />
          ) : (
            <Card className="p-5 text-muted-foreground">Lecture seule.</Card>
          )}
        </div>
        <div>
          <h2 className="mb-3 font-semibold">Derniers mouvements</h2>
          {p.stockMovements.length === 0 ? (
            <Card className="p-5 text-sm text-muted-foreground">Aucun mouvement.</Card>
          ) : (
            <Table head={["Date", "Où", "Qté", "Motif"]}>
              {p.stockMovements.map((m) => (
                <tr key={m.id}>
                  <td className={`${td} whitespace-nowrap text-xs`}>{fmtDate(m.createdAt, true)}</td>
                  <td className={`${td} text-xs`}>{LOCATION_LABEL[m.location].replace("Stock ", "")}</td>
                  <td className={`${td} tabular font-semibold ${m.quantity < 0 ? "text-destructive" : "text-success"}`}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                  <td className={`${td} text-xs`}>
                    {REASON[m.reason]}
                    {m.note && <div className="text-muted-foreground">{m.note}</div>}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
