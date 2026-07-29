"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { PRIMARY_LINKS, visibleLinks } from "@/lib/nav";
import { NavDrawer } from "@/components/play/NavDrawer";

/// Navigation principale : barre latérale gauche sur desktop (comme
/// AdminLayout), barre horizontale + bouton menu sur mobile. Plus de barre
/// fixée en bas — elle masquait le bas des pages et doublait le menu latéral.
export function PlayNav() {
  const pathname = usePathname();
  const { count, hydrated } = useCart();
  const { canSell, profile } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  // « Vendre » n'apparaît que pour les comptes vendeur/admin. L'accès direct à
  // /play/sell reste bloqué côté page et par les policies RLS.
  const items = visibleLinks(PRIMARY_LINKS, {
    canSell,
    isAdmin: profile?.is_admin ?? false,
  });

  const isActive = (href: string) =>
    href === "/play" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* Barre latérale gauche (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex">
        <Link href="/play" className="mb-8 block text-lg font-bold text-gold">
          ElijahShop
        </Link>
        <nav className="flex-1 space-y-1">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                isActive(href) ? "bg-gold/10 text-gold" : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {href === "/play/cart" && hydrated && count > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-black">
                  {count}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => setMenuOpen(true)}
          className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm hover:border-gold"
        >
          <Menu className="h-4 w-4" />
          Menu
        </button>
      </aside>

      {/* Barre du haut (mobile) */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md md:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link href="/play" className="text-lg font-bold text-gold">
            ElijahShop
          </Link>

          <nav className="flex flex-1 justify-end gap-4 overflow-x-auto text-sm">
            {items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 items-center gap-1.5 ${
                  isActive(href) ? "text-gold" : "text-muted"
                }`}
                aria-label={label}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {href === "/play/cart" && hydrated && count > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-black">
                      {count}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </nav>

          <button
            onClick={() => setMenuOpen(true)}
            className="shrink-0 rounded-full border border-border p-2 hover:border-gold"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
