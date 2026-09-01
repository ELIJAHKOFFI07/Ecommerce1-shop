import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";
import { withApiErrors } from "@/lib/apiError";

/// adminWalletsOverview — équivalent de la RPC admin_wallets_overview.
/// Un vrai GROUP BY côté base — plus le regroupement en mémoire qu'il avait
/// fallu écrire côté Parse.
export async function GET() {
  return withApiErrors(async () => {
    await requireAdmin();

    const rows = await db.$queryRaw<
      { userId: string; username: string; shopName: string | null; balance: number; lifetimeCredit: bigint; lifetimeWithdrawn: bigint }[]
    >`
      SELECT
        u.id as "userId", u.username, s.name as "shopName", w.balance,
        coalesce(sum(t.amount) filter (where t.amount > 0), 0) as "lifetimeCredit",
        coalesce(abs(sum(t.amount) filter (where t.amount < 0)), 0) as "lifetimeWithdrawn"
      FROM "Wallet" w
      JOIN "User" u ON u.id = w."userId"
      LEFT JOIN "Shop" s ON s."ownerId" = u.id
      LEFT JOIN "WalletTransaction" t ON t."walletUserId" = w."userId"
      GROUP BY u.id, u.username, s.name, w.balance
      ORDER BY w.balance DESC
    `;

    return NextResponse.json(
      rows.map((r) => ({
        ...r,
        lifetimeCredit: Number(r.lifetimeCredit),
        lifetimeWithdrawn: Number(r.lifetimeWithdrawn),
      })),
    );
  });
}
