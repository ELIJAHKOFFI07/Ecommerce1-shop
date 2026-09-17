"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cx } from "./ui";
import { CartBadge } from "./CartBadge";
import { SignOutButton } from "./SignOutButton";

const MEMBER_LINKS = [
  { href: "/espace/commandes", label: "Mes commandes" },
  { href: "/espace/stock", label: "Mon stock" },
  { href: "/espace/retraits", label: "Retraits" },
  { href: "/espace/portefeuille", label: "Solde" },
  { href: "/espace/bureau", label: "Bureau" },
  { href: "/espace/profil", label: "Profil" },
];

/// Une seule barre pour tout le côté utilisateur : logo, Boutique, les
/// rubriques de l'espace membre (si connecté), panier, compte. Sur
/// téléphone les rubriques passent dans une seconde rangée qui défile —
/// jamais derrière un menu.
export function HeaderNav({ user }: { user: { name: string; isStaff: boolean } | null }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/produit") : path.startsWith(href));
  const links = user ? [{ href: "/", label: "Boutique" }, ...MEMBER_LINKS] : [{ href: "/", label: "Boutique" }];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center" aria-label="SuperlifeShop — accueil">
          <Image src="/logo-wide.png" alt="SuperLife Côte d’Ivoire" width={658} height={120} priority className="h-9 w-auto sm:h-10" />
        </Link>

        {/* Rubriques (desktop) */}
        <nav aria-label="Navigation principale" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={active(l.href) ? "page" : undefined} className={cx("rounded-md px-3 py-2 text-[15px] font-semibold transition-colors", active(l.href) ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <CartBadge />
          {user ? (
            <>
              {user.isStaff && (
                <Link href="/admin" className="hidden rounded-md px-3 py-2 text-sm font-semibold hover:bg-muted sm:inline-block">
                  Administration
                </Link>
              )}
              <Link href="/espace" className="hidden rounded-md px-3 py-2 text-sm font-semibold hover:bg-muted sm:inline-block">
                {user.name.split(" ")[0]}
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link href="/connexion" className="press rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-secondary">
              Se connecter
            </Link>
          )}
        </div>
      </div>

      {/* Rubriques (mobile / tablette) : seconde rangée qui défile */}
      {user && (
        <nav aria-label="Espace membre" className="border-t border-border lg:hidden">
          <ul className="flex gap-1 overflow-x-auto px-3">
            {links.map((l) => (
              <li key={l.href} className="shrink-0">
                <Link href={l.href} aria-current={active(l.href) ? "page" : undefined} className={cx("inline-block border-b-2 px-3 py-2.5 text-sm font-semibold", active(l.href) ? "border-primary text-foreground" : "border-transparent text-muted-foreground")}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
