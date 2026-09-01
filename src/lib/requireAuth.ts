import { auth } from "@/lib/auth";
import { ApiError } from "@/lib/apiError";

/// Il n'y a plus de RLS pour vérifier ça à la place des routes — chaque
/// route qui a besoin d'un utilisateur connecté ou d'un admin appelle l'une
/// de ces deux fonctions en premier. Voir NEXTJS_BACKEND_MIGRATION.md §4.
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new ApiError(401, "Non connecté");
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) throw new ApiError(403, "Réservé aux administrateurs");
  return user;
}
