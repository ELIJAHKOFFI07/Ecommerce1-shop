import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";
import { ApiError, withApiErrors } from "@/lib/apiError";

/// adminUpdateProfile — équivalent de la RPC admin_update_profile. Support
/// client : un admin peut corriger le profil de n'importe quel compte.
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    await requireAdmin();
    const { id: userId } = await ctx.params;
    const { fullName, username, phone, whatsapp, city } = await request.json();

    if (!username?.trim()) throw new ApiError(400, "Le pseudo est obligatoire");

    await db.user.update({
      where: { id: userId },
      data: {
        fullName: fullName?.trim() || null,
        username: username.trim(),
        phone: phone?.trim() || null,
        whatsapp: whatsapp?.trim() || null,
        city: city?.trim() || null,
      },
    });

    return NextResponse.json({ ok: true });
  });
}
