import { db } from "./db";
import type { ReceiptProps } from "@/components/ReceiptDocument";

/// Construction des documents imprimables. Le membre voit ses propres
/// documents ; le staff (`isStaff`) les voit tous.
const STATUS_EN: Record<string, string> = {
  PENDING: "Pending",
  VALIDATED: "Validated",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  REJECTED: "Rejected",
  APPROVED: "Approved",
};

const shortDate = (d: Date) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(d);

async function site() {
  const s = await db.settings.findUnique({ where: { id: 1 }, select: { siteName: true, siteEmail: true, sitePhone: true } });
  return { name: s?.siteName ?? "SuperlifeShop", email: s?.siteEmail, phone: s?.sitePhone };
}

export async function orderReceipt(id: string, viewerId: string, isStaff: boolean): Promise<ReceiptProps | null> {
  const o = await db.order.findFirst({
    where: { id, ...(isStaff ? {} : { userId: viewerId }) },
    select: {
      orderNumber: true, status: true, subTotal: true, taxTotal: true, total: true, claimReference: true, salesNo: true, createdAt: true, validatedAt: true,
      user: { select: { name: true, memberNumber: true, pseudo: true, phone: true, email: true, city: true } },
      items: { select: { quantity: true, unitPrice: true, totalPrice: true, product: { select: { sku: true, title: true } } } },
    },
  });
  if (!o) return null;
  return {
    kind: "COMMANDE",
    number: o.orderNumber,
    issuedAt: o.validatedAt ?? o.createdAt,
    status: STATUS_EN[o.status] ?? o.status,
    member: o.user,
    refs: [
      { label: "Claim Reference", value: o.claimReference },
      ...(o.salesNo ? [{ label: "Sales No", value: o.salesNo }] : []),
      { label: "Order Date", value: shortDate(o.createdAt) },
    ],
    lines: o.items.map((it) => ({ code: it.product.sku, description: it.product.title, quantity: it.quantity, unitPrice: Number(it.unitPrice), total: Number(it.totalPrice) })),
    totals: [
      { label: "Sub Total", value: Number(o.subTotal) },
      { label: "Tax (payable at withdrawal)", value: Number(o.taxTotal) },
      { label: "Grand Total", value: Number(o.total), strong: true },
    ],
    site: await site(),
  };
}

export async function deliveryReceipt(id: string, viewerId: string, isStaff: boolean): Promise<ReceiptProps | null> {
  const d = await db.delivery.findFirst({
    where: { id, ...(isStaff ? {} : { userId: viewerId }) },
    select: {
      id: true, status: true, tva: true, tvaPaid: true, tvaPaymentMethod: true, recipientName: true, recipientPhone: true, createdAt: true, approvedAt: true, deliveredAt: true,
      user: { select: { name: true, memberNumber: true, pseudo: true, phone: true, email: true, city: true } },
      deliveredBy: { select: { name: true } },
      items: { select: { quantity: true, product: { select: { sku: true, title: true } } } },
    },
  });
  if (!d) return null;
  const tva = d.tva ? Number(d.tva) : 0;
  return {
    kind: "RETRAIT",
    number: `RET-${d.id.slice(0, 8).toUpperCase()}`,
    issuedAt: d.deliveredAt ?? d.approvedAt ?? d.createdAt,
    status: STATUS_EN[d.status] ?? d.status,
    member: d.user,
    refs: [
      { label: "Request Date", value: shortDate(d.createdAt) },
      { label: "Collected By", value: d.recipientName ? `${d.recipientName}${d.recipientPhone ? ` (${d.recipientPhone})` : ""}` : d.user.name },
      { label: "Tax", value: tva > 0 ? `${tva.toLocaleString("fr-FR")} F — ${d.tvaPaid ? `paid (${d.tvaPaymentMethod === "WALLET" ? "wallet" : "on site"})` : "unpaid"}` : "none" },
    ],
    lines: d.items.map((it) => ({ code: it.product.sku, description: it.product.title, quantity: it.quantity, unitPrice: null, total: null })),
    preparedBy: d.deliveredBy?.name ?? null,
    site: await site(),
  };
}
