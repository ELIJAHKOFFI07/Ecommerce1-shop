import { db } from "@/lib/db";
import { withApi, parseBody, ok } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { conversionSchema } from "@/lib/validators";
import { convertProduct } from "@/lib/stock";
import { audit } from "@/lib/audit";

export const GET = withApi(async () => {
  await requirePermission("conversions", "view");
  const list = await db.productConversion.findMany({
    select: {
      id: true, fromQuantity: true, toQuantity: true, comment: true, createdAt: true,
      fromProduct: { select: { title: true } }, toProduct: { select: { title: true } },
      client: { select: { name: true, memberNumber: true } }, admin: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return ok(list);
});

export const POST = withApi(async (req) => {
  const admin = await requirePermission("conversions", "edit");
  const input = await parseBody(req, conversionSchema);
  const c = await convertProduct({ ...input, adminId: admin.id });
  await audit("conversion.created", { userId: admin.id, target: c.id, req, meta: input });
  return ok(c, 201);
});
