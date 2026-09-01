import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";
import { withApiErrors } from "@/lib/apiError";

/// adminUpdateSettings — équivalent de la RPC admin_update_settings.
export async function POST(request: Request) {
  return withApiErrors(async () => {
    await requireAdmin();
    const { commissionPercent, minWithdrawal, supportPhone, supportEmail, announcement, announcementActive } =
      await request.json();

    const settings = await db.platformSettings.upsert({
      where: { id: 1 },
      update: { commissionPercent, minWithdrawal, supportPhone, supportEmail, announcement, announcementActive },
      create: {
        id: 1,
        commissionPercent,
        minWithdrawal,
        supportPhone,
        supportEmail,
        announcement,
        announcementActive: announcementActive ?? false,
      },
    });

    return NextResponse.json(settings);
  });
}
