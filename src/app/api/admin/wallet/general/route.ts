import { db } from "@/lib/db";
import { withApi, parseBody, ok } from "@/lib/apiError";
import { requireSuperAdmin } from "@/lib/requireAuth";
import { generalBalanceSchema, taxTransferSchema } from "@/lib/validators";
import { adjustGeneralBalance, transferTaxToGeneral } from "@/lib/wallet";
import { audit } from "@/lib/audit";

/// Soldes globaux + journal des mouvements système (userId null).
export const GET = withApi(async () => {
  await requireSuperAdmin();
  const [settings, transactions] = await Promise.all([
    db.settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {}, select: { generalBalance: true, taxBalance: true, systemBalance: true } }),
    db.walletTransaction.findMany({
      where: { userId: null },
      select: { id: true, amount: true, type: true, description: true, referenceId: true, createdAt: true, admin: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);
  return ok({ settings, transactions });
});

/// Ajustement du solde général (SUPER_ADMIN seulement, jamais délégué).
export const POST = withApi(async (req) => {
  const admin = await requireSuperAdmin();
  const input = await parseBody(req, generalBalanceSchema);
  const tx = await adjustGeneralBalance({ ...input, adminId: admin.id });
  await audit("wallet.general_adjust", { userId: admin.id, req, meta: input });
  return ok(tx, 201);
});

/// Bascule taxe → général.
export const PUT = withApi(async (req) => {
  const admin = await requireSuperAdmin();
  const input = await parseBody(req, taxTransferSchema);
  const tx = await transferTaxToGeneral({ amount: input.amount, adminId: admin.id });
  await audit("wallet.tax_transfer", { userId: admin.id, req, meta: input });
  return ok(tx);
});
