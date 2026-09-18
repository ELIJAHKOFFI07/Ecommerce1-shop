import { db } from "@/lib/db";
import { withApi, parseBody, ok } from "@/lib/apiError";
import { requireUser } from "@/lib/requireAuth";
import { orderCreateSchema } from "@/lib/validators";
import { createOrder } from "@/lib/orders";
import { audit } from "@/lib/audit";
import { sendOrderStatus, sendNewOrderToAdmin } from "@/lib/email";

export const orderSelect = {
  id: true, orderNumber: true, status: true, paymentMethod: true, paymentStatus: true, paymentRef: true, subTotal: true, shippingFee: true, total: true,
  shipFullName: true, shipPhone: true, shipCity: true, shipCommune: true, shipDetails: true, note: true, cancelReason: true,
  confirmedAt: true, shippedAt: true, deliveredAt: true, createdAt: true,
  items: { select: { id: true, productId: true, title: true, image: true, quantity: true, unitPrice: true, totalPrice: true } },
} as const;

/// Mes commandes — toujours filtrées par l'utilisateur connecté.
export const GET = withApi(async () => {
  const me = await requireUser();
  return ok(await db.order.findMany({ where: { userId: me.id }, select: orderSelect, orderBy: { createdAt: "desc" }, take: 100 }));
});

export const POST = withApi(async (req) => {
  const me = await requireUser();
  const input = await parseBody(req, orderCreateSchema);
  const order = await createOrder({ userId: me.id, items: input.items, paymentMethod: input.paymentMethod, address: input.address, note: input.note });
  if (input.saveAddress) {
    const count = await db.address.count({ where: { userId: me.id } });
    await db.address.create({ data: { userId: me.id, ...input.address, commune: input.address.commune ?? null, isDefault: count === 0 } });
  }
  await audit("order.created", { userId: me.id, target: order.id, req, meta: { orderNumber: order.orderNumber, total: order.total.toString() } });
  const [user, settings] = await Promise.all([db.user.findUnique({ where: { id: me.id }, select: { email: true, name: true } }), db.settings.findUnique({ where: { id: 1 }, select: { siteEmail: true } })]);
  if (user) void sendOrderStatus(user.email, user.name, order);
  if (settings?.siteEmail) void sendNewOrderToAdmin(settings.siteEmail, { ...order, customer: user?.name ?? "" });
  return ok(order, 201);
});
