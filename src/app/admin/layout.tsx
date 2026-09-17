import { pageStaff, visibleModules } from "@/lib/pageAuth";
import { BackBar } from "@/components/BackBar";
import type { MenuSection } from "@/components/MenuDrawer";
import { AdminNav } from "./AdminNav";

/// Back-office : barre fine + Menu ☰. Le menu ne montre que les modules
/// que l'admin peut consulter — le serveur refuse de toute façon l'accès
/// aux autres.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await pageStaff();
  const mods = await visibleModules(user);
  const has = (m: Parameters<typeof mods.has>[0]) => mods.has(m);
  const item = (href: string, label: string, exact?: boolean) => ({ href, label, exact });

  const sections: MenuSection[] = [
    {
      title: "Quotidien",
      items: [
        item("/admin", "Tableau de bord", true),
        ...(has("orders") ? [item("/admin/commandes", "Commandes"), item("/admin/recus", "Reçus")] : []),
        ...(has("deliveries") ? [item("/admin/retraits", "Retraits")] : []),
        ...(has("users") ? [item("/admin/membres", "Clients")] : []),
      ],
    },
    {
      title: "Catalogue et stock",
      items: [
        ...(has("products") ? [item("/admin/produits", "Produits")] : []),
        ...(has("categories") ? [item("/admin/categories", "Catégories")] : []),
        ...(has("stock") ? [item("/admin/stock", "Stock"), item("/admin/stock/reappro", "Commandes fournisseur"), item("/admin/stock/mouvements", "Historique du stock")] : []),
        ...(has("conversions") ? [item("/admin/conversions", "Conversions")] : []),
      ],
    },
    {
      title: "Argent",
      items: [...(has("wallet") ? [item("/admin/comptabilite", "Comptabilité"), item("/admin/portefeuilles", "Portefeuilles")] : []), ...(user.role === "SUPER_ADMIN" ? [item("/admin/portefeuilles/general", "Caisse")] : [])],
    },
    {
      title: "Organisation",
      items: [
        ...(has("offices") ? [item("/admin/bureaux", "Bureaux")] : []),
        ...(has("formations") ? [item("/admin/formations", "Formations")] : []),
        ...(has("settings") ? [item("/admin/parametres", "Paramètres")] : []),
        ...(user.role === "SUPER_ADMIN" ? [item("/admin/journal", "Journal d’audit")] : []),
      ],
    },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="min-h-dvh">
      <AdminNav sections={sections} userName={user.name ?? ""} role={user.role} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <BackBar roots={["/admin"]} />
        {children}
      </main>
    </div>
  );
}
