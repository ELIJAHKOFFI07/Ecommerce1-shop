"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Menu,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { AccountDropdown } from "@/components/play/AccountDropdown";

/// Barre de navigation minimale et collante : logo à gauche, recherche au
/// centre (desktop), actions à droite. Pas de menu catégories déroulant ni
/// d'animation — l'essentiel, rien de plus.
///
/// Le tiroir mobile est un simple panneau de liens : on ne réutilise pas
/// `NavDrawer` (play) car celui-ci exige un `SessionProvider` absent de la
/// vitrine. `AccountDropdown` utilise `useOptionalSession`, sûr hors provider.
const MOBILE_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/play/search", label: "Recherche", icon: Search },
  { href: "/play/search", label: "Catalogue", icon: ShoppingBag },
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
            href="/"
            className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <span className="grid h-9 w-9 place-items-center rounded-sm bg-foreground text-background">
              <ShoppingBag className="h-5 w-5" strokeWidth={2} />
            </span>
            DreamTeam<span className="text-accent">Shop</span>
          </Link>

          {/* Recherche (centre, desktop) */}
          <Link
            href="/play/search"
            className="hidden flex-1 justify-center lg:flex"
          >
            <span className="flex w-full max-w-md items-center gap-2 rounded-sm bg-surface px-4 py-2.5 text-sm text-muted hover:bg-surface-2">
              <Search className="h-4 w-4 shrink-0" strokeWidth={2} />
              Rechercher un produit…
            </span>
          </Link>

          {/* Actions */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link
              href="/play/sell"
              className="hidden items-center gap-2 rounded-sm bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 sm:inline-flex"
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
              <span className="text-lg font-semibold">Menu</span>
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
                  className="flex items-center gap-3 rounded-sm px-3 py-3 text-sm font-medium hover:bg-surface-2"
                >
                  <Icon className="h-4 w-4 text-accent" strokeWidth={2} />
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
