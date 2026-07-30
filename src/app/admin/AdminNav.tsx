"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  Flag,
  Landmark,
  LayoutDashboard,
  Menu,
  Package,
  Receipt,
  Settings,
  Shapes,
  ShoppingBag,
  Tag,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

type AdminLink = { href: string; label: string; icon: LucideIcon };

/// Regroupement par métier plutôt qu'une liste plate : le back-office
/// dépassait dix entrées, sans hiérarchie lisible.
const SECTIONS: { title: string; links: AdminLink[] }[] = [
  {
    title: "Pilotage",
    links: [
      { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/admin/accounting", label: "Comptabilité", icon: Landmark },
      { href: "/admin/invoices", label: "Factures", icon: Receipt },
    ],
  },
  {
    title: "Catalogue",
    links: [
      { href: "/admin/products", label: "Produits", icon: Package },
      { href: "/admin/categories", label: "Catégories", icon: Shapes },
      { href: "/admin/stock", label: "Stock", icon: Boxes },
      { href: "/admin/coupons", label: "Coupons", icon: Tag },
    ],
  },
  {
    title: "Activité",
    links: [
      { href: "/admin/orders", label: "Commandes", icon: ShoppingBag },
      { href: "/admin/reports", label: "Signalements", icon: Flag },
    ],
  },
  {
    title: "Administration",
    links: [
      { href: "/admin/users", label: "Utilisateurs", icon: Users },
      { href: "/admin/settings", label: "Réglages", icon: Settings },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);

  const content = (
    <>
      <Link
        href="/admin"
        className="mb-6 block text-lg font-bold text-gold"
      >
        DreamTeamShop <span className="text-muted">admin</span>
      </Link>

      <nav className="flex-1 space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.links.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    // Ferme le tiroir mobile ; sans effet sur desktop.
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive(href)
                        ? "bg-gold/10 font-medium text-gold"
                        : "text-muted hover:bg-surface-2 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-6 space-y-3 border-t border-border pt-4">
        <ThemeSwitcher />
        {/* Sortie explicite du back-office vers la boutique publique. */}
        <Link
          href="/play"
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:border-gold hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la boutique
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Barre latérale (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex lg:w-72 lg:p-5">
        {content}
      </aside>

      {/* En-tête + tiroir (mobile) */}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg border border-border p-2 hover:border-gold"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="font-bold text-gold">
          DreamTeamShop <span className="text-muted">admin</span>
        </span>
        <Link
          href="/play"
          className="ml-auto text-xs text-muted hover:text-gold"
        >
          Boutique →
        </Link>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60"
            aria-label="Fermer le menu"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-border bg-surface p-4">
            <button
              onClick={() => setOpen(false)}
              className="mb-2 self-end text-muted hover:text-foreground"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
