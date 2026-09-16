"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const TABS = [
  { href: "/espace", label: "Accueil", exact: true },
  { href: "/espace/commandes", label: "Commandes" },
  { href: "/espace/stock", label: "Mon stock" },
  { href: "/espace/retraits", label: "Retraits" },
  { href: "/espace/portefeuille", label: "Solde" },
  { href: "/espace/bureau", label: "Bureau" },
  { href: "/espace/profil", label: "Profil" },
];

export function MemberNav() {
  const path = usePathname();
  return (
    <nav aria-label="Espace membre" className="-mx-4 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-1">
        {TABS.map((t) => {
          const active = t.exact ? path === t.href : path.startsWith(t.href);
          return (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cx("inline-block border-b-2 px-3 py-3 text-sm font-semibold transition-colors", active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
