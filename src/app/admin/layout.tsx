import { pageStaff, visibleModules } from "@/lib/pageAuth";
import { AdminNav, type NavItem } from "./AdminNav";

/// Back-office : barre du haut. Le menu ne montre que les modules que
/// l'admin peut consulter — le serveur refuse de toute façon l'accès aux
/// autres.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await pageStaff();
  const mods = await visibleModules(user);
  const has = (m: Parameters<typeof mods.has>[0]) => mods.has(m);

  // Onglets du quotidien, dans l'ordre où l'admin s'en sert.
  const primary: NavItem[] = [
    { href: "/admin", label: "Tableau de bord", exact: true },
    ...(has("orders") ? [{ href: "/admin/commandes", label: "Commandes" }] : []),
    ...(has("deliveries") ? [{ href: "/admin/retraits", label: "Retraits" }] : []),
    ...(has("products") ? [{ href: "/admin/produits", label: "Produits" }] : []),
    ...(has("stock") ? [{ href: "/admin/stock", label: "Stock" }] : []),
    ...(has("users") ? [{ href: "/admin/membres", label: "Membres" }] : []),
    ...(has("wallet") ? [{ href: "/admin/portefeuilles", label: "Portefeuilles" }] : []),
  ];
  const more: NavItem[] = [
    ...(has("categories") ? [{ href: "/admin/categories", label: "Catégories" }] : []),
    ...(has("conversions") ? [{ href: "/admin/conversions", label: "Conversions" }] : []),
    ...(has("offices") ? [{ href: "/admin/bureaux", label: "Bureaux" }] : []),
    ...(has("formations") ? [{ href: "/admin/formations", label: "Formations" }] : []),
    ...(has("settings") ? [{ href: "/admin/parametres", label: "Paramètres" }] : []),
    ...(user.role === "SUPER_ADMIN" ? [{ href: "/admin/journal", label: "Journal d’audit" }] : []),
  ];

  return (
    <div className="min-h-dvh">
      <AdminNav primary={primary} more={more} userName={user.name ?? ""} role={user.role} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">{children}</main>
    </div>
  );
}
