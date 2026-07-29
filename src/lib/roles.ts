import type { Profile } from "./types";

/// Trois niveaux de comptes, dérivés de profiles (voir
/// supabase/migrations/005_user_roles.sql) :
///   user    — consulte et achète
///   seller  — + ouvre sa boutique et publie des produits
///   admin   — back-office
///
/// Module volontairement sans "use client" : il est importé aussi bien par
/// des Server Components (/admin/users) que par le contexte client.
export type UserRole = "user" | "seller" | "admin";

export const ROLE_LABELS: Record<UserRole, string> = {
  user: "Client",
  seller: "Vendeur",
  admin: "Administrateur",
};

export function roleOf(profile: Profile | null): UserRole | null {
  if (!profile) return null;
  if (profile.is_admin) return "admin";
  if (profile.is_seller) return "seller";
  return "user";
}
