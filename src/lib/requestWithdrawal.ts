import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/apiError";
import { loadSettings } from "@/lib/settings";
import { TRANSACTION_OPTIONS } from "@/lib/transactionOptions";

/// requestWithdrawal — équivalent de la RPC request_withdrawal. Extraite du
/// Route Handler pour être testable directement.
export async function requestWithdrawal(userId: string, amount: number, phone: string) {
  const { minWithdrawal } = await loadSettings();
  if (amount < minWithdrawal) throw new ApiError(400, `Retrait minimum : ${minWithdrawal} FCFA`);

  await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ userId: string; balance: number }[]>(
      Prisma.sql`SELECT "userId", balance FROM "Wallet" WHERE "userId" = ${userId}::uuid FOR UPDATE`,
    );
    const wallet = rows[0];
    if (!wallet || wallet.balance < amount) throw new ApiError(400, "Solde insuffisant");

    await tx.wallet.update({ where: { userId }, data: { balance: { decrement: amount } } });
    await tx.walletTransaction.create({
      data: { walletUserId: userId, amount: -amount, kind: "withdrawal", note: `Vers ${phone}` },
    });
  }, TRANSACTION_OPTIONS);
}
