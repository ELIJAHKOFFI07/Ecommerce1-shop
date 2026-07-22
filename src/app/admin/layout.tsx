import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingBag,
  Flag,
  Tag,
  Boxes,
  Landmark,
  Receipt,
  Settings,
} from "lucide-react";
import { SetupNotice } from "@/components/play/SetupNotice";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const links = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/products", label: "Produits", icon: Package },
  { href: "/admin/stock", label: "Stock", icon: Boxes },
  { href: "/admin/orders", label: "Commandes", icon: ShoppingBag },
  { href: "/admin/accounting", label: "Comptabilité", icon: Landmark },
  { href: "/admin/invoices", label: "Factures", icon: Receipt },
  { href: "/admin/coupons", label: "Coupons", icon: Tag },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/reports", label: "Signalements", icon: Flag },
  { href: "/admin/settings", label: "Réglages", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surface p-4 md:block">
        <Link href="/admin" className="mb-8 block text-lg font-bold text-gold">
          ElijahShop <span className="text-muted">admin</span>
        </Link>
        <nav className="space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-8">
          <ThemeSwitcher />
        </div>
        <Link
          href="/play"
          className="mt-4 block text-xs text-muted hover:text-gold"
        >
          ← Retour à l&apos;app
        </Link>
      </aside>
      <main className="flex-1 p-6">
        <div className="mb-6 flex gap-2 overflow-x-auto md:hidden">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="whitespace-nowrap rounded-full bg-surface-2 px-3 py-1 text-xs text-muted"
            >
              {label}
            </Link>
          ))}
        </div>
        {isSupabaseConfigured() ? children : <SetupNotice />}
      </main>
    </div>
  );
}
