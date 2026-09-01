import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";
import { ApiError, withApiErrors } from "@/lib/apiError";
import { setupNewUser } from "@/lib/newUserSetup";

/// Création, modification et suppression de comptes par un administrateur.
/// Portée depuis Supabase (auth.admin.createUser / .updateUserById /
/// .deleteUser) vers Prisma direct — il n'y a plus d'API d'admin séparée à
/// appeler, ce fichier EST l'autorité.

export async function POST(request: Request) {
  return withApiErrors(async () => {
    await requireAdmin();
    const { email, password, username, role } = await request.json();

    if (!email?.trim() || !username?.trim()) throw new ApiError(400, "E-mail et pseudo obligatoires.");
    if (!password || password.length < 8) throw new ApiError(400, "Le mot de passe doit faire au moins 8 caractères.");

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.user.create({
      data: {
        email: email.trim(),
        username: username.trim(),
        passwordHash,
        isAdmin: role === "admin",
        isSeller: role === "admin" || role === "seller",
      },
    });
    await setupNewUser(user.id);

    return NextResponse.json({ ok: true, userId: user.id });
  });
}

export async function PATCH(request: Request) {
  return withApiErrors(async () => {
    const admin = await requireAdmin();
    const { userId, role, fullName, username, phone, whatsapp, city } = await request.json();
    if (!userId) throw new ApiError(400, "userId manquant.");

    if (username !== undefined) {
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
    }

    if (role) {
      // Un admin ne peut pas se retirer son propre statut : sans ce
      // garde-fou, le dernier administrateur pourrait se verrouiller hors
      // du back-office.
      if (userId === admin.id && role !== "admin") {
        throw new ApiError(400, "Vous ne pouvez pas retirer votre propre statut administrateur.");
      }
      await db.user.update({
        where: { id: userId },
        data: { isAdmin: role === "admin", isSeller: role === "seller" || role === "admin" },
      });
    }

    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(request: Request) {
  return withApiErrors(async () => {
    const admin = await requireAdmin();
    const { userId } = await request.json();
    if (!userId) throw new ApiError(400, "userId manquant.");
    if (userId === admin.id) throw new ApiError(400, "Vous ne pouvez pas supprimer votre propre compte.");

    // La suppression propage en cascade (onDelete: Cascade dans schema.prisma)
    // sur tout ce qui dépend de ce compte.
    await db.user.delete({ where: { id: userId } });

    return NextResponse.json({ ok: true });
  });
}
