import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/requireAuth";
import { ApiError, withApiErrors } from "@/lib/apiError";

/// spinWheel — équivalent de la RPC spin_wheel. Un tirage par jour ; le
/// gain est décidé ici, jamais par le client.
export async function POST() {
  return withApiErrors(async () => {
    const user = await requireUser();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const reward = await db.$transaction(async (tx) => {
      // Verrou consultatif par utilisateur, le temps de la transaction :
      // sans lui, deux tirages envoyés en même temps par le même compte
      // peuvent tous les deux passer le contrôle "déjà joué aujourd'hui"
      // avant qu'aucun des deux n'ait inséré sa ligne (même famille de
      // course que le stock, juste avec un enjeu bien plus faible).
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`);

      const already = await tx.spinReward.findFirst({
        where: { userId: user.id, createdAt: { gte: startOfDay } },
      });
      if (already) throw new ApiError(400, "Déjà joué aujourd'hui");

      const roll = Math.random() * 100;
      let kind: "nothing" | "points" | "coupon";
      let value = 0;
      let code: string | undefined;

      if (roll < 40) {
        kind = "nothing";
      } else if (roll < 70) {
        kind = "points";
        value = 10;
      } else if (roll < 90) {
        kind = "points";
        value = 50;
      } else if (roll < 98) {
        kind = "coupon";
        value = 5;
        code = "SPIN" + Math.random().toString(36).slice(2, 8).toUpperCase();
      } else {
        kind = "coupon";
        value = 15;
        code = "SPIN" + Math.random().toString(36).slice(2, 8).toUpperCase();
      }

      if (kind === "points") {
        await tx.user.update({ where: { id: user.id }, data: { loyaltyPoints: { increment: value } } });
      } else if (kind === "coupon" && code) {
        await tx.coupon.create({ data: { code, type: "percent", value, minOrderAmount: 0, maxUses: 1 } });
      }

      return tx.spinReward.create({
        data: { userId: user.id, prizeKind: kind, prizeValue: value, couponCode: code },
      });
    });

    return NextResponse.json(reward);
  });
}
