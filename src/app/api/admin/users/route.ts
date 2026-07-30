import { NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/admin/guard";

/// Création, modification et suppression de comptes par un administrateur.
/// Toutes les opérations passent par la clé service_role côté serveur : le
/// navigateur ne peut pas écrire dans auth.users.

type CreateBody = {
  email?: string;
  password?: string;
  username?: string;
  role?: "user" | "seller" | "admin";
};

export async function POST(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: check.status });
  }

  const body = (await request.json()) as CreateBody;
  const email = body.email?.trim();
  const password = body.password ?? "";
  const username = body.username?.trim();

  if (!email || !username) {
    return NextResponse.json(
      { error: "E-mail et pseudo obligatoires." },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit faire au moins 8 caractères." },
      { status: 400 },
    );
  }

  const admin = serviceClient();
  // Le trigger handle_new_user crée le profil, le portefeuille et le code de
  // parrainage à partir de ces métadonnées.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Création impossible." },
      { status: 400 },
    );
  }

  // Le rôle est écrit directement : admin_set_user_role s'appuie sur
  // auth.uid(), qui n'existe pas pour la clé service_role. L'autorisation a
  // déjà été vérifiée par requireAdmin ci-dessus.
  const role = body.role ?? "user";
  if (role !== "user") {
    await admin
      .from("profiles")
      .update({ is_admin: role === "admin", is_seller: role === "seller" })
      .eq("id", data.user.id);
  }

  return NextResponse.json({ ok: true, userId: data.user.id });
}

type PatchBody = {
  userId?: string;
  role?: "user" | "seller" | "admin";
  fullName?: string | null;
  username?: string;
  phone?: string | null;
  whatsapp?: string | null;
  city?: string | null;
};

export async function PATCH(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: check.status });
  }

  const body = (await request.json()) as PatchBody;
  if (!body.userId) {
    return NextResponse.json({ error: "userId manquant." }, { status: 400 });
  }

  const admin = serviceClient();

  if (body.username !== undefined) {
    const { error } = await admin
      .from("profiles")
      .update({
        full_name: body.fullName?.trim() || null,
        username: body.username.trim(),
        phone: body.phone?.trim() || null,
        whatsapp: body.whatsapp?.trim() || null,
        city: body.city?.trim() || null,
      })
      .eq("id", body.userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  if (body.role) {
    // Un admin ne peut pas se retirer son propre statut : sans ce garde-fou,
    // le dernier administrateur pourrait se verrouiller hors du back-office.
    if (body.userId === check.adminId && body.role !== "admin") {
      return NextResponse.json(
        { error: "Vous ne pouvez pas retirer votre propre statut administrateur." },
        { status: 400 },
      );
    }
    const { error } = await admin
      .from("profiles")
      .update({
        is_admin: body.role === "admin",
        is_seller: body.role === "seller",
      })
      .eq("id", body.userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: check.status });
  }

  const { userId } = (await request.json()) as { userId?: string };
  if (!userId) {
    return NextResponse.json({ error: "userId manquant." }, { status: 400 });
  }
  if (userId === check.adminId) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas supprimer votre propre compte." },
      { status: 400 },
    );
  }

  // La suppression dans auth.users propage en cascade sur profiles et tout
  // ce qui en dépend (on delete cascade dans schema.sql).
  const { error } = await serviceClient().auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
