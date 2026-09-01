import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/requireAuth";
import { ApiError, withApiErrors } from "@/lib/apiError";

/// Changement de mot de passe par l'utilisateur lui-même — couvre à la fois
/// le changement volontaire et le cas mustChangePassword (équivalent de
/// clear_password_change_flag) : dans les deux cas, l'ancien mot de passe
/// doit être fourni et vérifié, il n'y a pas de contournement.
export async function POST(request: Request) {
  return withApiErrors(async () => {
    const sessionUser = await requireUser();
    const { currentPassword, newPassword } = await request.json();

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      throw new ApiError(400, "Nouveau mot de passe trop court (8 caractères minimum)");
    }

    const user = await db.user.findUniqueOrThrow({ where: { id: sessionUser.id } });
    if (!user.passwordHash) {
      throw new ApiError(400, "Ce compte se connecte via Google, pas de mot de passe à changer");
    }
    const valid = await bcrypt.compare(currentPassword ?? "", user.passwordHash);
    if (!valid) throw new ApiError(400, "Mot de passe actuel incorrect");

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });

    return NextResponse.json({ ok: true });
  });
}
