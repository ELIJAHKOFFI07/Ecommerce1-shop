import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";
import { withApiErrors } from "@/lib/apiError";
import { generateTempPassword } from "@/lib/tempPassword";

/// adminRequirePasswordChange — équivalent de la RPC du même nom, fusionnée
/// avec la génération du mot de passe elle-même : Supabase déléguait ça à
/// l'API admin auth.users, qu'on n'a plus. Le mot de passe temporaire est
/// généré ici (jamais choisi par l'admin) et renvoyé une seule fois — c'est
/// à l'admin de le communiquer au compte concerné.
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    await requireAdmin();
    const { id: userId } = await ctx.params;

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    await db.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: true },
    });

    return NextResponse.json({ ok: true, tempPassword });
  });
}
