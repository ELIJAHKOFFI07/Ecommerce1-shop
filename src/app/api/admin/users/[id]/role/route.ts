import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";
import { ApiError, withApiErrors } from "@/lib/apiError";

/// adminSetUserRole — équivalent de la RPC admin_set_user_role.
/// isAdmin/isSeller ne sont modifiables par AUCUNE autre route — c'est
/// exactement le bug d'élévation de privilège trouvé une fois côté
/// Supabase (écriture directe update({is_admin}) dans le back-office) puis
/// reproduit une fois côté Parse avant d'être corrigé. Ce point d'entrée
/// unique est la seule protection qui reste sans RLS pour l'appliquer.
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const admin = await requireAdmin();
    const { id: userId } = await ctx.params;
    const { role } = await request.json();

    if (!["user", "seller", "admin"].includes(role)) throw new ApiError(400, "Rôle inconnu");
    // Un admin ne peut pas se retirer son propre statut : sans ce
    // garde-fou, le dernier administrateur pourrait se verrouiller hors du
    // back-office.
    if (userId === admin.id && role !== "admin") {
      throw new ApiError(400, "Vous ne pouvez pas retirer votre propre statut administrateur.");
    }

    const target = await db.user.findUniqueOrThrow({ where: { id: userId } });
    const wasSeller = target.isSeller;

    await db.user.update({
      where: { id: userId },
      data: { isAdmin: role === "admin", isSeller: role === "admin" || role === "seller" },
    });

    // Équivalent du trigger on_seller_revoked : un vendeur rétrogradé garde
    // ses produits, mais ils ne doivent plus rester en vente sans
    // surveillance.
    if (wasSeller && role === "user") {
      await db.product.updateMany({
        where: { sellerId: userId, status: "active" },
        data: { status: "paused" },
      });
    }

    return NextResponse.json({ ok: true, role });
  });
}
