import { notFound } from "next/navigation";
import { pageUser } from "@/lib/pageAuth";
import { ADMIN_ROLES } from "@/lib/requireAuth";
import { uuid } from "@/lib/validators";
import { orderReceipt } from "@/lib/receipts";
import { ReceiptDocument } from "@/components/ReceiptDocument";

export const dynamic = "force-dynamic";

export default async function OrderReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await pageUser();
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) notFound();
  const r = await orderReceipt(parsed.data, me.id, ADMIN_ROLES.includes(me.role));
  if (!r) notFound();
  return <ReceiptDocument {...r} />;
}
