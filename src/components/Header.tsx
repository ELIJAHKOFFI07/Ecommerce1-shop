import { auth } from "@/lib/auth";
import { HeaderNav } from "./HeaderNav";

/// En-tête public et membre. La session est lue ici, côté serveur, pour
/// que la barre s'affiche juste du premier coup (pas de version visiteur
/// remplacée par la version membre après hydratation).
export async function Header() {
  const session = await auth();
  const user = session?.user;
  const isStaff = Boolean(user && ["SUPER_ADMIN", "ADMIN", "STOCK_MANAGER", "SUPPORT"].includes(user.role));
  return <HeaderNav user={user ? { name: user.name ?? "", isStaff } : null} />;
}
