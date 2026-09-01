import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/requireAuth";
import { ApiError, withApiErrors } from "@/lib/apiError";

/// redeemPoints — équivalent de la RPC redeem_points.
/// Barème : 1 point = 10 FCFA, minimum 50 points. Produit un coupon
/// personnel à usage unique.
export async function POST(request: Request) {
  return withApiErrors(async () => {
    const user = await requireUser();
    const { points } = await request.json();
    if (points < 50) throw new ApiError(400, "Minimum 50 points");

    const code = "PTS" + Math.random().toString(36).slice(2, 9).toUpperCase();

    await db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ loyaltyPoints: number }[]>(
        Prisma.sql`SELECT "loyaltyPoints" FROM "User" WHERE id = ${user.id}::uuid FOR UPDATE`,
      );
      const balance = rows[0]?.loyaltyPoints ?? 0;
      if (balance < points) throw new ApiError(400, "Points insuffisants");

      await tx.user.update({ where: { id: user.id }, data: { loyaltyPoints: { decrement: points } } });
      await tx.coupon.create({
        data: { code, type: "fixed", value: points * 10, minOrderAmount: 0, maxUses: 1 },
      });
    });

    return NextResponse.json({ code });
  });
}
