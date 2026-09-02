import Link from "next/link";
import { ShoppingBag } from "lucide-react";

const EXPLORE_LINKS: { href: string; label: string }[] = [
  { href: "/play/search", label: "Catalogue" },
  { href: "/play/search?category=mode", label: "Mode" },
  { href: "/play/search?category=telephones", label: "Téléphones" },
  { href: "/play/auctions", label: "Enchères" },
];

const SELLER_LINKS: { href: string; label: string }[] = [
  { href: "/play/sell", label: "Ouvrir une boutique" },
  { href: "/play/wallet", label: "Portefeuille & retraits" },
  { href: "/play/account", label: "Mon compte" },
];

const ACCOUNT_LINKS: { href: string; label: string }[] = [
  { href: "/play/account", label: "Mon profil" },
  { href: "/play/orders", label: "Mes commandes" },
  { href: "/play/wishlists", label: "Mes listes" },
];

/// Pied de page minimaliste : quatre colonnes (marque, navigation, vendeurs,
/// compte) + copyright. Une seule bordure discrète en haut, pas de badges
/// paiement colorés.
export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <span className="grid h-9 w-9 place-items-center rounded-sm bg-foreground text-background">
              <ShoppingBag className="h-5 w-5" strokeWidth={2} />
            </span>
            DreamTeam<span className="text-accent">Shop</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            La marketplace sociale de Côte d&apos;Ivoire. Achète, vends et
            négocie près de chez toi — en Mobile Money ou à la livraison.
          </p>
        </div>

        <div>
          <p className="mb-4 text-sm font-semibold">Explorer</p>
          <ul className="space-y-2.5 text-sm text-muted">
            {EXPLORE_LINKS.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-4 text-sm font-semibold">Vendeurs</p>
          <ul className="space-y-2.5 text-sm text-muted">
            {SELLER_LINKS.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-4 text-sm font-semibold">Compte</p>
          <ul className="space-y-2.5 text-sm text-muted">
            {ACCOUNT_LINKS.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-6">
          <p>© 2026 DreamTeamShop — Fait avec fierté à Abidjan.</p>
          <p className="font-medium">Acheter · Négocier · Vendre</p>
        </div>
      </div>
    </footer>
  );
}
