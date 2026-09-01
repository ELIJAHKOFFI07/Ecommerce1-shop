import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";
import { ApiError, withApiErrors } from "@/lib/apiError";
import { generateTempPassword } from "@/lib/tempPassword";

/// Ancien chemin (body { userId }), conservé pour ne pas casser les pages
/// admin existantes le temps de leur bascule. Logique identique à
/// /api/admin/users/[id]/reset-password — voir ce fichier pour le détail.
export async function POST(request: Request) {
  return withApiErrors(async () => {
    await requireAdmin();
    const { userId } = await request.json();
    if (!userId) throw new ApiError(400, "userId manquant.");

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    await db.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: true } });

    return NextResponse.json({ ok: true, tempPassword });
  });
}
