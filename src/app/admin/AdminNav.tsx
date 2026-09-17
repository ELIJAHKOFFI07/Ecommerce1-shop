"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cx } from "@/components/ui";
import { SignOutButton } from "@/components/SignOutButton";

export type NavItem = { href: string; label: string; exact?: boolean };

const ROLE_LABEL: Record<string, string> = { SUPER_ADMIN: "Super administrateur", ADMIN: "Administrateur", STOCK_MANAGER: "Gestion du stock", SUPPORT: "Support" };

export function AdminNav({ items, userName, role }: { items: NavItem[]; userName: string; role: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (i: NavItem) => (i.exact ? path === i.href : path.startsWith(i.href));

  const list = (
    <ul className="space-y-0.5">
      {items.map((i) => (
        <li key={i.href}>
          <Link
            href={i.href}
            onClick={() => setOpen(false)}
            aria-current={isActive(i) ? "page" : undefined}
            className={cx("block rounded-md px-3 py-2.5 text-[15px] font-semibold transition-colors", isActive(i) ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted")}
          >
            {i.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {/* Mobile */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
        <Link href="/admin" className="font-display text-xl font-bold">
          Superlife<span className="text-accent">Shop</span> <span className="text-sm font-sans font-semibold text-muted-foreground">admin</span>
        </Link>
        <button type="button" aria-label="Ouvrir le menu" aria-expanded={open} onClick={() => setOpen(true)} className="grid h-11 w-11 cursor-pointer place-items-center rounded-md hover:bg-muted">
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-background p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold">Menu</span>
              <button type="button" aria-label="Fermer" onClick={() => setOpen(false)} className="grid h-11 w-11 cursor-pointer place-items-center rounded-md hover:bg-muted">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {list}
            <div className="mt-auto border-t border-border pt-4">
              <Link href="/" className="block px-3 py-2 text-sm font-semibold text-muted-foreground">
                Voir la boutique
              </Link>
              <SignOutButton />
            </div>
          </aside>
        </div>
      )}

      {/* Desktop */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-background p-5 lg:flex">
        <Link href="/admin" className="font-display text-2xl font-bold">
          Superlife<span className="text-accent">Shop</span>
        </Link>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Administration</p>
        <nav className="mt-6 flex-1 overflow-y-auto" aria-label="Administration">
          {list}
        </nav>
        <div className="border-t border-border pt-4">
          <p className="truncate text-sm font-semibold">{userName}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABEL[role] ?? role}</p>
          <div className="mt-2 flex items-center gap-1">
            <Link href="/" className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
              Boutique
            </Link>
            <SignOutButton />
          </div>
        </div>
      </aside>
    </>
  );
}
