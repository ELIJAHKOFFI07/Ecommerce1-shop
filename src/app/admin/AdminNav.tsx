"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cx } from "@/components/ui";
import { SignOutButton } from "@/components/SignOutButton";

export type NavItem = { href: string; label: string; exact?: boolean };

const ROLE_LABEL: Record<string, string> = { SUPER_ADMIN: "Super administrateur", ADMIN: "Administrateur", STOCK_MANAGER: "Gestion du stock", SUPPORT: "Support" };

/// Barre du haut du back-office. Les écrans du quotidien (commandes,
/// retraits, produits, stock, membres, portefeuilles) sont des onglets
/// toujours visibles ; le reste est sous « Plus ». Sur téléphone, la
/// rangée d'onglets défile horizontalement — rien n'est caché derrière
/// un menu.
export function AdminNav({ primary, more, userName, role }: { primary: NavItem[]; more: NavItem[]; userName: string; role: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = (i: NavItem) => (i.exact ? path === i.href : path.startsWith(i.href));
  const moreActive = more.some(isActive);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/admin" className="font-display shrink-0 text-xl font-bold">
          Superlife<span className="text-accent">Shop</span> <span className="ml-1 font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">admin</span>
        </Link>
        <div className="flex items-center gap-1">
          <span className="hidden text-sm text-muted-foreground md:inline">
            <span className="font-semibold text-foreground">{userName}</span> · {ROLE_LABEL[role] ?? role}
          </span>
          <Link href="/" className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
            Boutique
          </Link>
          <SignOutButton />
        </div>
      </div>

      <nav aria-label="Administration" className="mx-auto max-w-7xl px-4 sm:px-6">
        <ul className="-mb-px flex gap-1 overflow-x-auto">
          {primary.map((i) => (
            <li key={i.href} className="shrink-0">
              <Link
                href={i.href}
                aria-current={isActive(i) ? "page" : undefined}
                className={cx("inline-block border-b-2 px-3 py-3 text-[15px] font-semibold transition-colors", isActive(i) ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
              >
                {i.label}
              </Link>
            </li>
          ))}
          {more.length > 0 && (
            <li className="relative shrink-0" ref={ref}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className={cx("inline-flex cursor-pointer items-center gap-1 border-b-2 px-3 py-3 text-[15px] font-semibold transition-colors", moreActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
              >
                Plus <ChevronDown className={cx("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
              </button>
              {open && (
                <ul role="menu" className="absolute right-0 z-50 mt-1 w-56 rounded-lg border border-border bg-card p-1 shadow-lg">
                  {more.map((i) => (
                    <li key={i.href} role="none">
                      <Link
                        role="menuitem"
                        href={i.href}
                        onClick={() => setOpen(false)}
                        className={cx("block rounded-md px-3 py-2.5 text-[15px] font-semibold", isActive(i) ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                      >
                        {i.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}
