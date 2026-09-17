import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { Empty, PageTitle, fmtDate } from "@/components/ui";
import { Table, td } from "@/components/admin";
import { ConversionForm } from "./ConversionForm";

export const dynamic = "force-dynamic";

export default async function ConversionsPage() {
  const { canEdit } = await pageModule("conversions");
  const [list, products] = await Promise.all([
    db.productConversion.findMany({
      select: { id: true, fromQuantity: true, toQuantity: true, comment: true, createdAt: true, fromProduct: { select: { title: true } }, toProduct: { select: { title: true } }, client: { select: { name: true, memberNumber: true } }, admin: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.product.findMany({ select: { id: true, title: true, sku: true }, orderBy: { title: "asc" } }),
  ]);
  return (
    <>
      <PageTitle title="Conversions" subtitle="Échanger le produit A d’un membre contre le produit B." />
      <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
        {canEdit && <ConversionForm products={products} />}
        <div>
          {list.length === 0 ? (
            <Empty title="Aucune conversion" />
          ) : (
            <Table head={["Date", "Membre", "Rend", "Reçoit", "Par"]}>
              {list.map((c) => (
                <tr key={c.id}>
                  <td className={`${td} whitespace-nowrap text-sm`}>{fmtDate(c.createdAt)}</td>
                  <td className={td}>
                    {c.client.name}
                    <div className="text-xs text-muted-foreground">{c.client.memberNumber}</div>
                  </td>
                  <td className={`${td} text-sm`}>
                    {c.fromQuantity} × {c.fromProduct.title}
                  </td>
                  <td className={`${td} text-sm`}>
                    {c.toQuantity} × {c.toProduct.title}
                    {c.comment && <div className="text-xs text-muted-foreground">{c.comment}</div>}
                  </td>
                  <td className={`${td} text-sm text-muted-foreground`}>{c.admin.name}</td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </div>
    </>
  );
}
