import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";
import { ADMIN_ROLES, type ModuleSlug, type SessionUser } from "./requireAuth";

/// Gardes pour les PAGES (composants serveur) : elles redirigent au lieu
/// de lever. Les routes API, elles, utilisent requireAuth.ts.
export async function pageUser(next?: string): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id || session.user.blocked) {
    redirect(`/connexion${next ? `?suite=${encodeURIComponent(next)}` : ""}`);
  }
  return session.user;
}

export async function pageStaff(): Promise<SessionUser> {
  const user = await pageUser("/admin");
  if (!ADMIN_ROLES.includes(user.role)) redirect("/espace");
  return user;
}

/// Permission de lecture d'un module pour une page admin. Renvoie aussi
/// `canEdit` pour masquer les boutons d'action quand l'admin ne peut que
/// consulter — le serveur refuse de toute façon l'écriture.
export async function pageModule(slug: ModuleSlug): Promise<{ user: SessionUser; canEdit: boolean }> {
  const user = await pageStaff();
  if (user.role === "SUPER_ADMIN") return { user, canEdit: true };
  const perm = await db.userPermission.findFirst({ where: { userId: user.id, module: { slug } }, select: { canView: true, canEdit: true } });
  if (!perm?.canView && !perm?.canEdit) redirect("/admin?refus=" + slug);
  return { user, canEdit: Boolean(perm?.canEdit) };
}

/// Modules visibles par un membre du staff (pour construire le menu).
export async function visibleModules(user: SessionUser): Promise<Set<ModuleSlug>> {
  if (user.role === "SUPER_ADMIN") {
    return new Set(["products", "categories", "stock", "orders", "deliveries", "wallet", "users", "offices", "formations", "conversions", "settings"]);
  }
  const perms = await db.userPermission.findMany({ where: { userId: user.id, OR: [{ canView: true }, { canEdit: true }] }, select: { module: { select: { slug: true } } } });
  return new Set(perms.map((p) => p.module.slug as ModuleSlug));
}
