import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withApiErrors } from "@/lib/apiError";

/// referralLeaderboard — un vrai GROUP BY côté base, plus le contournement
/// "regroupé en mémoire" qu'il avait fallu écrire côté Parse faute
/// d'agrégation native accessible simplement.
export async function GET(request: Request) {
  return withApiErrors(async () => {
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 20);

    const rows = await db.$queryRaw<
      { userId: string; username: string; avatarUrl: string | null; referralsCount: bigint }[]
    >`
      SELECT u.id as "userId", u.username, u."avatarUrl", count(r.id) as "referralsCount"
      FROM "Referral" r
      JOIN "User" u ON u.id = r."referrerId"
      GROUP BY u.id, u.username, u."avatarUrl"
      ORDER BY count(r.id) DESC, u.username
      LIMIT ${limit}
    `;

    return NextResponse.json(rows.map((r) => ({ ...r, referralsCount: Number(r.referralsCount) })));
  });
}
