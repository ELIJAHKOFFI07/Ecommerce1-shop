import { db } from "@/lib/db";
import { withApi, ok } from "@/lib/apiError";
import { requireUser } from "@/lib/requireAuth";
import { getBalance } from "@/lib/wallet";

/// Mon portefeuille : solde + 100 derniers mouvements.
export const GET = withApi(async () => {
  const me = await requireUser();
  const [balance, transactions] = await Promise.all([
    getBalance(me.id),
    db.walletTransaction.findMany({
      where: { userId: me.id },
      select: { id: true, amount: true, type: true, description: true, paymentMethod: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  return ok({ balance, transactions });
});
