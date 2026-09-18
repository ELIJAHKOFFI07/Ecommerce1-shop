import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pageModule, visibleModules } from "@/lib/pageAuth";
import { uuid } from "@/lib/validators";
import { Card, PageTitle, fmtDate, ButtonLink } from "@/components/ui";
import { Table, td, ActionButton } from "@/components/admin";
import { ProductForm } from "../ProductForm";
import { REASON_LABEL } from "@/lib/stockLabels";

export const dynamic = "force-dynamic";

export default async function AdminProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, canEdit } = await pageModule("products");
  const mods = await visibleModules(user);
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const [p, categories] = await Promise.all([
    db.product.findUnique({
      where: { id: parsed.data },
      select: {
        id: true, sku: true, slug: true, title: true, description: true, price: true, compareAtPrice: true, images: true, active: true, featured: true, lowStockAlert: true, stock: true,
        categories: { select: { id: true } },
        stockMovements: { select: { id: true, quantity: true, reason: true, note: true, createdAt: true, user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 30 },
        _count: { select: { orderItems: true } },
      },
    }),
    db.category.findMany({ select: { id: true, name: true }, orderBy: [{ position: "asc" }, { name: "asc" }] }),
  ]);
  if (!p) notFound();

  return (
    <div className="space-y-8">
      <PageTitle
        title={p.title}
        subtitle={p.sku}
        action={
          canEdit ? (
            <div className="flex flex-wrap gap-2">
              {mods.has("stock") && <ButtonLink href={`/admin/stock/ajuster?produit=${p.id}`}>+ Ajouter du stock</ButtonLink>}
              <ButtonLink href={`/produit/${p.slug}`} variant="ghost">Voir dans la boutique</ButtonLink>
              <ActionButton path={`/api/admin/products/${p.id}`} method="DELETE" variant="ghost" confirm={`Supprimer « ${p.title} » ?${p._count.orderItems ? " Il figure dans des commandes : il sera seulement retiré de la vente." : ""}`} redirect="/admin/produits">Supprimer</ActionButton>
            </div>
          ) : undefined
        }
      />

      <Card className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stock actuel</p>
          <p className={`font-display mt-1 text-5xl font-semibold tabular ${p.stock <= 0 ? "text-destructive" : p.stock <= p.lowStockAlert ? "text-warning" : ""}`}>{p.stock}</p>
        </div>
        <p className="max-w-xs text-sm text-muted-foreground">{p.stock <= 0 ? "Rupture : le produit s’affiche « Épuisé » dans la boutique." : p.stock <= p.lowStockAlert ? "Sous le seuil d’alerte." : "Disponible à la vente."}</p>
      </Card>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="min-w-0">
          {canEdit ? (
            <ProductForm
              categories={categories}
              initial={{ id: p.id, sku: p.sku, title: p.title, description: p.description ?? "", price: Number(p.price), compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : "", images: p.images, active: p.active, featured: p.featured, lowStockAlert: p.lowStockAlert, categoryIds: p.categories.map((c) => c.id) }}
            />
          ) : (
            <Card className="p-5 text-muted-foreground">Lecture seule.</Card>
          )}
        </div>
        <div>
          <h2 className="mb-3 font-semibold">Derniers mouvements de stock</h2>
          {p.stockMovements.length === 0 ? (
            <Card className="p-5 text-sm text-muted-foreground">Aucun mouvement.</Card>
          ) : (
            <Table head={["Date", "Qté", "Motif", "Par"]}>
              {p.stockMovements.map((m) => (
                <tr key={m.id}>
                  <td className={`${td} whitespace-nowrap text-xs`}>{fmtDate(m.createdAt, true)}</td>
                  <td className={`${td} tabular font-semibold ${m.quantity < 0 ? "text-destructive" : "text-success"}`}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                  <td className={`${td} text-xs`}>
                    {REASON_LABEL[m.reason]}
                    {m.note && <div className="text-muted-foreground">{m.note}</div>}
                  </td>
                  <td className={`${td} text-xs text-muted-foreground`}>{m.user?.name ?? "—"}</td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
