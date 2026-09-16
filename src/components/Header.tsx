import Link from "next/link";
import { auth } from "@/lib/auth";
import { CartBadge } from "./CartBadge";
import { SignOutButton } from "./SignOutButton";

/// En-tête public et membre. Trois éléments, jamais plus : la marque, le
/// panier, et « Mon espace » (ou « Se connecter »). L'admin a son propre
/// habillage.
export async function Header() {
  const session = await auth();
  const user = session?.user;
  const isStaff = user && ["SUPER_ADMIN", "ADMIN", "STOCK_MANAGER", "SUPPORT"].includes(user.role);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="font-display text-2xl font-bold tracking-tight">
          Superlife<span className="text-accent">Shop</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Navigation principale">
          <Link href="/" className="hidden rounded-md px-3 py-2 text-sm font-semibold hover:bg-muted sm:inline-block">
            Boutique
          </Link>
          <CartBadge />
          {user ? (
            <>
              <Link href={isStaff ? "/admin" : "/espace"} className="rounded-md px-3 py-2 text-sm font-semibold hover:bg-muted">
                {isStaff ? "Administration" : "Mon espace"}
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link href="/connexion" className="press rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-secondary">
              Se connecter
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
