"use client";

import Link from "next/link";
import { MenuDrawer, type MenuSection } from "@/components/MenuDrawer";
import { Brand } from "@/components/Brand";

const ROLE_LABEL: Record<string, string> = { SUPER_ADMIN: "Super administrateur", ADMIN: "Administrateur", STOCK_MANAGER: "Gestion du stock", SUPPORT: "Support" };

/// Barre fine du back-office : logo, lien Boutique, Menu ☰ avec toutes
/// les options groupées (Quotidien / Catalogue / Argent / Organisation).
export function AdminNav({ sections, userName, role }: { sections: MenuSection[]; userName: string; role: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/admin" className="flex shrink-0 items-center gap-2" aria-label="Administration — tableau de bord">
          <Brand />
          <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">admin</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/" className="hidden rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-block">
            Boutique
          </Link>
          <MenuDrawer sections={sections} userName={userName} subtitle={ROLE_LABEL[role] ?? role} />
        </div>
      </div>
    </header>
  );
}
