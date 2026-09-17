"use client";

import Link from "next/link";
import Image from "next/image";
import { CartBadge } from "./CartBadge";
import { MenuDrawer, type MenuSection } from "./MenuDrawer";

/// Barre fine côté utilisateur : logo, panier, Menu ☰ (ou « Se connecter »).
/// Toutes les options sont dans le menu — un seul endroit à connaître.
export function HeaderNav({ user }: { user: { name: string; memberNumber: string; isStaff: boolean } | null }) {
  const sections: MenuSection[] = user
    ? [
        { items: [{ href: "/", label: "Boutique", exact: true }, { href: "/panier", label: "Panier" }] },
        {
          title: "Mon espace",
          items: [
            { href: "/espace", label: "Accueil", exact: true },
            { href: "/espace/commandes", label: "Mes commandes" },
            { href: "/espace/stock", label: "Mon stock" },
            { href: "/espace/retraits", label: "Retraits" },
            { href: "/espace/portefeuille", label: "Solde" },
            { href: "/espace/bureau", label: "Bureau" },
            { href: "/espace/profil", label: "Profil" },
          ],
        },
        ...(user.isStaff ? [{ title: "Équipe", items: [{ href: "/admin", label: "Administration" }] }] : []),
      ]
    : [{ items: [{ href: "/", label: "Boutique", exact: true }, { href: "/panier", label: "Panier" }, { href: "/connexion", label: "Se connecter" }, { href: "/inscription", label: "Créer un compte" }] }];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center" aria-label="SuperlifeShop — accueil">
          <Image src="/logo-wide.png" alt="SuperLife Côte d’Ivoire" width={658} height={120} priority className="h-9 w-auto rounded-md sm:h-10 dark-logo" />
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <CartBadge />
          {user ? (
            <MenuDrawer sections={sections} userName={user.name} subtitle={`Membre n° ${user.memberNumber}`} />
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
