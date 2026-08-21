"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home } from "lucide-react";
import { SECTIONS, visibleLinks } from "@/lib/nav";

/// Barre de navigation horizontale du dashboard compte : les destinations de
/// l'espace personnel en un seul rang scrollable (pas de sidebar). Le lien
/// actif est détecté via `usePathname` avec préfixe — la page d'accueil du
/// dashboard `/play/account` n'est active qu'à l'identique.
///
/// Les liens proviennent de `SECTIONS` (src/lib/nav.ts) : une entrée ajoutée
/// là-bas apparaît automatiquement ici. Le rôle (vendeur/admin) est résolu
/// côté serveur dans le layout `(account)` et transmis en props pour filtrer
/// les liens sans état de chargement côté navigateur.
///
/// Le rang est scrollable : tactile par glisser (overflow-x-auto natif) et
/// molette de souris via un écouteur wheel non passif — un conteneur
/// horizontal ne définit pas par défaut avec la molette.
export function AccountDashboardNav({
  canSell,
  isAdmin,
}: {
  canSell: boolean;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const trackRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // La molette verticale devient un défilement horizontal du rang, sans
      // bloquer le scroll de page quand le rang tient entièrement à l'écran.
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const links = [
    { href: "/play/account", label: "Profile", icon: Home },
    ...SECTIONS.flatMap((section) =>
      visibleLinks(section.links, { canSell, isAdmin }),
    ),
  ];

  const isActive = (href: string) =>
    href === "/play/account"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      ref={trackRef}
      aria-label="Navigation du compte"
      className="scrollbar-hide flex items-center gap-2 overflow-x-auto overscroll-x-contain pb-1"
    >
      {links.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-sm inline-flex shrink-0 items-center gap-2 px-4 py-2.5 font-display text-sm font-bold transition-all ${
              active
                ? "bg-primary text-primary-foreground"
                : "bg-card text-foreground hover:bg-surface-2"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={2.5} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
