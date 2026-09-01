import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { setupNewUser } from "@/lib/newUserSetup";
import { linkReferral } from "@/lib/referral";

/// Inscription e-mail/mot de passe — équivalent de supabase.auth.signUp.
/// Auth.js ne fournit pas de route d'inscription toute faite pour
/// Credentials (contrairement à Supabase) : c'est un choix délibéré du
/// projet — il attend que l'appli gère elle-même la création du compte.
export async function POST(request: Request) {
  const { email, password, username, referralCode } = await request.json();

  if (typeof email !== "string" || typeof password !== "string" || typeof username !== "string") {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Mot de passe trop court (8 caractères minimum)" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Ce compte existe déjà" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: { email, username, passwordHash },
  });
  await setupNewUser(user.id);
  if (typeof referralCode === "string" && referralCode.trim()) {
    await linkReferral(user.id, referralCode);
  }

  return NextResponse.json({ ok: true });
}
