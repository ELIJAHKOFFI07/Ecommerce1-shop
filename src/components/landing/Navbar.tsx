"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Menu,
  ShoppingBag,
  ShoppingCart,
  Store,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { AccountDropdown } from "@/components/play/AccountDropdown";

/// Barre de navigation : logo, vendre, compte, panier. Rien d'autre.
///
/// La recherche a été retirée d'ici : elle occupe déjà toute la largeur en
/// haut de l'accueil, la répéter dans la barre affichait deux champs de
/// recherche l'un au-dessus de l'autre. Le tiroir mobile listait par
/// ailleurs « Recherche » et « Catalogue » qui pointaient tous deux vers
/// /play/search — deux libellés pour une seule destination.
///
/// On ne réutilise pas `NavDrawer` (play) : celui-ci exige un
/// `SessionProvider`. `AccountDropdown` utilise `useOptionalSession`, sûr
/// hors provider.
const MOBILE_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/play", label: "Boutique", icon: ShoppingBag },
  { href: "/play/sell", label: "Vendre", icon: Store },
  { href: "/play/account", label: "Mon compte", icon: User },
  { href: "/play/cart", label: "Panier", icon: ShoppingCart },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          {/* Mobile : bouton menu */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le menu"
            aria-expanded={open}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-sm text-foreground hover:bg-surface-2 lg:hidden"
          >
            <Menu className="h-5 w-5" strokeWidth={2} />
          </button>

          {/* Logo */}
          <Link
            href="/play"
            className="flex shrink-0 items-center gap-2 text-xl font-semibold tracking-tight"
          >
            <span className="grid h-10 w-10 place-items-center rounded-sm bg-foreground text-background">
              <ShoppingBag className="h-5 w-5" strokeWidth={2} />
            </span>
            DreamTeam<span className="text-accent">Shop</span>
          </Link>

          {/* Actions */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link
              href="/play/sell"
              className="hidden items-center gap-2 rounded-sm bg-foreground px-5 py-2.5 text-base font-medium text-background hover:bg-foreground/90 sm:inline-flex"
            >
              <Store className="h-4 w-4" strokeWidth={2} />
              Vendre
            </Link>

            <AccountDropdown label="Mon compte" icon={User} round />

            <Link
              href="/play/cart"
              aria-label="Panier"
              className="grid h-10 w-10 place-items-center rounded-sm text-foreground hover:bg-surface-2"
            >
              <ShoppingCart className="h-5 w-5" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </header>

      {/* Tiroir mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-foreground/50"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-background">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <span className="text-xl font-semibold">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="grid h-10 w-10 place-items-center rounded-sm text-foreground hover:bg-surface-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-4">
              {MOBILE_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-sm px-3 py-3.5 text-base font-medium hover:bg-surface-2"
                >
                  <Icon className="h-5 w-5 text-accent" strokeWidth={2} />
                  {label}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
