import { NextResponse } from "next/server";
import {
  generateTempPassword,
  requireAdmin,
  serviceClient,
} from "@/lib/admin/guard";

/// Réinitialisation du mot de passe d'un compte par un administrateur.
///
/// Renvoie un mot de passe temporaire que l'admin communique à
/// l'utilisateur. Le compte est marqué must_change_password : à sa
/// prochaine connexion, l'utilisateur est obligé d'en choisir un nouveau
/// avant d'accéder au reste de l'application (migration 008).
export async function POST(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: check.status });
  }

  const { userId } = (await request.json()) as { userId?: string };
  if (!userId) {
    return NextResponse.json({ error: "userId manquant." }, { status: 400 });
  }

  const admin = serviceClient();
  const tempPassword = generateTempPassword();

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: tempPassword,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { error: flagError } = await admin
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", userId);
  if (flagError) {
    return NextResponse.json({ error: flagError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, tempPassword });
}
