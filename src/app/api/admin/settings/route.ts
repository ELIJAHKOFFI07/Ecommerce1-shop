import { db } from "@/lib/db";
import { withApi, parseBody, ok } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { settingsSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";

/// Les compteurs financiers (generalBalance…) ne sont PAS dans le schéma :
/// ils ne bougent que par les opérations de wallet.ts, jamais par une
/// modification directe.
const select = { siteName: true, siteEmail: true, sitePhone: true, logo: true, currency: true, taxRate: true, allowReceiptSending: true } as const;

export const GET = withApi(async () => {
  await requirePermission("settings", "view");
  return ok(await db.settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {}, select }));
});

export const PATCH = withApi(async (req) => {
  const admin = await requirePermission("settings", "edit");
  const input = await parseBody(req, settingsSchema);
  const s = await db.settings.upsert({ where: { id: 1 }, create: { id: 1, ...input }, update: input, select });
  await audit("settings.updated", { userId: admin.id, req, meta: input });
  return ok(s);
});
