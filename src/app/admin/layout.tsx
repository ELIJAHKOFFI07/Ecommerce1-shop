import { pageStaff, visibleModules } from "@/lib/pageAuth";
import { AdminNav, type NavItem } from "./AdminNav";

/// Back-office : barre latérale (desktop) ou tiroir (mobile). Le menu ne
/// montre que les modules que l'admin peut consulter — le serveur refuse
/// de toute façon l'accès aux autres.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await pageStaff();
  const mods = await visibleModules(user);
  const items: NavItem[] = [
    { href: "/admin", label: "Tableau de bord", exact: true },
    ...(mods.has("orders") ? [{ href: "/admin/commandes", label: "Commandes" }] : []),
    ...(mods.has("deliveries") ? [{ href: "/admin/retraits", label: "Retraits" }] : []),
    ...(mods.has("products") ? [{ href: "/admin/produits", label: "Produits" }] : []),
    ...(mods.has("categories") ? [{ href: "/admin/categories", label: "Catégories" }] : []),
    ...(mods.has("stock") ? [{ href: "/admin/stock", label: "Stock" }] : []),
    ...(mods.has("conversions") ? [{ href: "/admin/conversions", label: "Conversions" }] : []),
    ...(mods.has("wallet") ? [{ href: "/admin/portefeuilles", label: "Portefeuilles" }] : []),
    ...(mods.has("users") ? [{ href: "/admin/membres", label: "Membres" }] : []),
    ...(mods.has("offices") ? [{ href: "/admin/bureaux", label: "Bureaux" }] : []),
    ...(mods.has("formations") ? [{ href: "/admin/formations", label: "Formations" }] : []),
    ...(mods.has("settings") ? [{ href: "/admin/parametres", label: "Paramètres" }] : []),
    ...(user.role === "SUPER_ADMIN" ? [{ href: "/admin/journal", label: "Journal d’audit" }] : []),
  ];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <AdminNav items={items} userName={user.name ?? ""} role={user.role} />
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
