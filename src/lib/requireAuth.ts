import type { Role } from "../../prisma/generated/client";
import { auth } from "./auth";
import { db } from "./db";
import { forbidden, unauthorized } from "./apiError";

export type SessionUser = {
  id: string;
  role: Role;
  blocked: boolean;
  name?: string | null;
  email?: string | null;
};

/// Utilisateur connecté et non bloqué. Un compte bloqué est refusé même
/// avec un JWT valide.
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) throw unauthorized();
  if (session.user.blocked) throw forbidden();
  return session.user;
}

export const ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "STOCK_MANAGER", "SUPPORT"];

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw forbidden();
  return user;
}

/// Tout rôle de back-office (lecture). Les écritures passent par
/// requirePermission.
export async function requireStaff(): Promise<SessionUser> {
  return requireRole(...ADMIN_ROLES);
}

export const requireSuperAdmin = () => requireRole("SUPER_ADMIN");

/// Slugs de modules à permissions fines. Le SUPER_ADMIN les contourne tous ;
/// les autres rôles doivent avoir la ligne UserPermission correspondante.
export type ModuleSlug = "products" | "categories" | "stock" | "orders" | "users" | "accounting" | "settings";

export const MODULES: { slug: ModuleSlug; name: string; description: string }[] = [
  { slug: "products", name: "Produits", description: "Catalogue et fiches produit" },
  { slug: "categories", name: "Catégories", description: "Rayons de la boutique" },
  { slug: "stock", name: "Stock", description: "Niveaux, entrées, sorties, historique" },
  { slug: "orders", name: "Commandes", description: "Confirmation, expédition, livraison, annulation" },
  { slug: "users", name: "Utilisateurs", description: "Comptes, rôles, blocage" },
  { slug: "accounting", name: "Comptabilité", description: "Ventes, paiements, exports" },
  { slug: "settings", name: "Paramètres", description: "Réglages de la boutique" },
];

export async function requirePermission(slug: ModuleSlug, level: "view" | "edit"): Promise<SessionUser> {
  const user = await requireStaff();
  if (user.role === "SUPER_ADMIN") return user;
  const perm = await db.userPermission.findFirst({
    where: { userId: user.id, module: { slug } },
    select: { canView: true, canEdit: true },
  });
  const allowed = level === "view" ? perm?.canView || perm?.canEdit : perm?.canEdit;
  if (!allowed) throw forbidden();
  return user;
}

/// Vérifie qu'une ressource appartient à l'appelant, sauf pour le staff.
/// C'est la garde contre l'IDOR : deviner l'identifiant d'une commande
/// d'un autre membre ne doit rien donner.
export function assertOwnerOrStaff(user: SessionUser, ownerId: string): void {
  if (user.id === ownerId) return;
  if (ADMIN_ROLES.includes(user.role)) return;
  throw forbidden();
}
