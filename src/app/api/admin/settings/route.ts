import { db } from "@/lib/db";
import { withApi, parseBody, ok } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { settingsSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { invalidateCatalog } from "@/lib/catalog";

const select = { siteName: true, siteEmail: true, sitePhone: true, siteAddress: true, currency: true, shippingFee: true, freeShippingThreshold: true, mobileMoneyNumber: true, mobileMoneyName: true } as const;

export const GET = withApi(async () => {
  await requirePermission("settings", "view");
  return ok(await db.settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {}, select }));
});

export const PATCH = withApi(async (req) => {
  const admin = await requirePermission("settings", "edit");
  const input = await parseBody(req, settingsSchema);
  const s = await db.settings.upsert({ where: { id: 1 }, create: { id: 1, ...input }, update: input, select });
  await audit("settings.updated", { userId: admin.id, req, meta: input });
  invalidateCatalog();
  return ok(s);
});
