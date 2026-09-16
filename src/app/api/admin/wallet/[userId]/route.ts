import { db } from "@/lib/db";
import { withApi, ok, notFound } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { uuid } from "@/lib/validators";

export const GET = withApi<{ params: Promise<{ userId: string }> }>(async (_req, { params }) => {
  await requirePermission("wallet", "view");
  const userId = uuid.parse((await params).userId);
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, memberNumber: true, email: true, phone: true, wallet: { select: { balance: true } } },
  });
  if (!user) throw notFound("Membre");
  const transactions = await db.walletTransaction.findMany({
    where: { userId },
    select: { id: true, amount: true, type: true, description: true, referenceId: true, paymentMethod: true, proofUrl: true, createdAt: true, admin: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return ok({ user, transactions });
});
