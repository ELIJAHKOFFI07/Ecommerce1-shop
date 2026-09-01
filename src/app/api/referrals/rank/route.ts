import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/requireAuth";
import { withApiErrors } from "@/lib/apiError";

/// myReferralRank — rang de l'utilisateur connecté dans le classement.
export async function GET() {
  return withApiErrors(async () => {
    const user = await requireUser();

    const rows = await db.$queryRaw<{ rank: bigint }[]>`
      SELECT rank FROM (
        SELECT "referrerId", rank() OVER (ORDER BY count(*) DESC) as rank
        FROM "Referral"
        GROUP BY "referrerId"
      ) ranked
      WHERE "referrerId" = ${user.id}::uuid
    `;

    return NextResponse.json({ rank: rows[0] ? Number(rows[0].rank) : null });
  });
}
