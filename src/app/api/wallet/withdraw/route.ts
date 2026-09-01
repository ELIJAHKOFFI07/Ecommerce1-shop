import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/requireAuth";
import { ApiError, withApiErrors } from "@/lib/apiError";
import { loadSettings } from "@/lib/settings";

/// requestWithdrawal — équivalent de la RPC request_withdrawal.
export async function POST(request: Request) {
  return withApiErrors(async () => {
    const user = await requireUser();
    const { amount, phone } = await request.json();
    const { minWithdrawal } = await loadSettings();

    if (amount < minWithdrawal) throw new ApiError(400, `Retrait minimum : ${minWithdrawal} FCFA`);

    await db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ userId: string; balance: number }[]>(
        Prisma.sql`SELECT "userId", balance FROM "Wallet" WHERE "userId" = ${user.id}::uuid FOR UPDATE`,
      );
      const wallet = rows[0];
      if (!wallet || wallet.balance < amount) throw new ApiError(400, "Solde insuffisant");

      await tx.wallet.update({ where: { userId: user.id }, data: { balance: { decrement: amount } } });
      await tx.walletTransaction.create({
        data: { walletUserId: user.id, amount: -amount, kind: "withdrawal", note: `Vers ${phone}` },
      });
    });

    return NextResponse.json({ ok: true });
  });
}
