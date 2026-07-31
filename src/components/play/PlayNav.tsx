"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { BOTTOM_LINKS, PRIMARY_LINKS, visibleLinks } from "@/lib/nav";
import { NavDrawer } from "@/components/play/NavDrawer";

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
      {/* Barre du haut */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-6 lg:py-4 2xl:max-w-[1440px]">
          {/* Accès à toutes les fonctionnalités de l'espace personnel, à
              toutes les tailles d'écran : la barre du bas ne peut en afficher
              que 5. */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm hover:border-gold"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-4 w-4" />
            <span className="hidden sm:inline">Menu</span>
          </button>

          <Link href="/play" className="text-lg font-bold text-gold lg:text-xl">
            DreamTeamShop
          </Link>

          <nav className="ml-auto hidden gap-6 text-sm md:flex lg:gap-8 lg:text-base">
            {items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 ${
                  isActive(href) ? "text-gold" : "text-muted hover:text-foreground"
                }`}
              >
                <span className="relative">
                  <Icon className="h-4 w-4" />
                  {href === "/play/cart" && hydrated && count > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-black">
                      {count}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Barre du bas (téléphone).
          `pb-[env(safe-area-inset-bottom)]` : sur les iPhone récents, la
          barre d'accueil recouvrirait sinon le bas des libellés. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        {BOTTOM_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] ${
              isActive(href) ? "text-gold" : "text-muted"
            }`}
          >
            <span className="relative">
              <Icon className="h-5 w-5" />
              {href === "/play/cart" && hydrated && count > 0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-black">
                  {count}
                </span>
              )}
            </span>
            {label}
          </Link>
        ))}
      </nav>

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
