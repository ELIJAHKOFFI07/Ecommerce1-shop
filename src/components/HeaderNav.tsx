"use client";

import Link from "next/link";
import { Brand } from "./Brand";
import { CartBadge } from "./CartBadge";
import { MenuDrawer, type MenuSection } from "./MenuDrawer";

/// Barre fine : logotype, panier, Menu ☰ (ou « Se connecter »).
export function HeaderNav({ user }: { user: { name: string; email: string; isStaff: boolean } | null }) {
  const sections: MenuSection[] = user
    ? [
        { items: [{ href: "/", label: "Boutique", exact: true }, { href: "/panier", label: "Panier" }] },
        { title: "Mon compte", items: [{ href: "/compte", label: "Accueil", exact: true }, { href: "/compte/commandes", label: "Mes commandes" }, { href: "/compte/adresses", label: "Mes adresses" }, { href: "/compte/profil", label: "Profil" }] },
        ...(user.isStaff ? [{ title: "Équipe", items: [{ href: "/admin", label: "Administration" }] }] : []),
      ]
    : [{ items: [{ href: "/", label: "Boutique", exact: true }, { href: "/panier", label: "Panier" }, { href: "/connexion", label: "Se connecter" }, { href: "/inscription", label: "Créer un compte" }] }];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Brand />
        <div className="flex shrink-0 items-center gap-2">
          <CartBadge />
          {user ? (
            <MenuDrawer sections={sections} userName={user.name} subtitle={user.email} />
          ) : (
            <>
              <Link href="/connexion" className="press hidden rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-secondary sm:inline-block">
                Se connecter
              </Link>
              <MenuDrawer sections={sections} signOut={false} />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
