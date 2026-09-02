import {
  Bell,
  Bookmark,
  Handshake,
  Home,
  LayoutDashboard,
  MessageCircle,
  Package,
  Search,
  ShoppingCart,
  Store,
  User,
  UserPen,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  /// Réservé aux comptes vendeur ou admin.
  sellerOnly?: boolean;
  /// Réservé aux comptes admin.
  adminOnly?: boolean;
};

/// Barre principale : les 5 destinations les plus fréquentes.
/// Le reste vit dans le menu (voir SECTIONS ci-dessous).
export const PRIMARY_LINKS: NavLink[] = [
  { href: "/play", label: "Accueil", icon: Home },
  { href: "/play/search", label: "Recherche", icon: Search },
  { href: "/play/sell", label: "Vendre", icon: Store, sellerOnly: true },
  { href: "/play/cart", label: "Panier", icon: ShoppingCart },
  { href: "/play/account", label: "Compte", icon: User },
];

/// Barre du bas (téléphone) : quatre destinations valables pour tout le
/// monde, sans condition de rôle.
///
/// Volontairement distincte de PRIMARY_LINKS : les items étant en `flex-1`,
/// une entrée qui apparaît après le chargement de la session ferait passer
/// chaque item de 25 % à 20 % de largeur, et toutes les icônes se
/// décaleraient sous le doigt. « Vendre » reste accessible par la barre du
/// haut et par le menu.
export const BOTTOM_LINKS: NavLink[] = [
  { href: "/play", label: "Accueil", icon: Home },
  { href: "/play/search", label: "Recherche", icon: Search },
  { href: "/play/cart", label: "Panier", icon: ShoppingCart },
  { href: "/play/account", label: "Compte", icon: User },
];

/// Toutes les fonctionnalités de l'espace personnel, regroupées par thème.
/// Source unique partagée par le menu de navigation et la page /play/account :
/// ajouter une entrée ici la fait apparaître aux deux endroits.
export const SECTIONS: { title: string; links: NavLink[] }[] = [
  {
    title: "Mes achats",
    links: [
      { href: "/play/orders", label: "Mes commandes", icon: Package },
      { href: "/play/wishlists", label: "Mes listes", icon: Bookmark },
      { href: "/play/offers", label: "Mes offres", icon: Handshake },
    ],
  },
  {
    title: "Échanges",
    links: [
      { href: "/play/notifications", label: "Notifications", icon: Bell },
      { href: "/play/messages", label: "Messages", icon: MessageCircle },
    ],
  },
  {
    title: "Gains",
    links: [{ href: "/play/wallet", label: "Portefeuille", icon: Wallet }],
  },
  {
    title: "Mon compte",
    links: [
      { href: "/play/account/edit", label: "Modifier mon profil", icon: UserPen },
      {
        href: "/play/sell",
        label: "Ma boutique / Vendre",
        icon: Store,
        sellerOnly: true,
      },
      {
        href: "/admin",
        label: "Back-office admin",
        icon: LayoutDashboard,
        adminOnly: true,
      },
    ],
  },
];

/// Sections réservées aux comptes connectés.
///
/// Un visiteur peut tout parcourir — catalogue, fiches produit, boutiques,
/// recherche, panier — mais ces chemins-là n'ont aucun sens sans compte : ils
/// le renvoient vers la connexion, avec retour automatique une fois connecté.
///
/// `/play/cart` en est volontairement absent : le panier se remplit sans
/// compte, la connexion n'est exigée qu'au paiement.
export const MEMBER_ONLY_PREFIXES = [
  "/play/account",
  "/play/orders",
  "/play/wishlists",
  "/play/offers",
  "/play/messages",
  "/play/notifications",
  "/play/wallet",
  "/play/sell",
  "/play/checkout",
] as const;

export function isMemberOnly(pathname: string): boolean {
  return MEMBER_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
}

/// Filtre les entrées selon le rôle du compte courant.
export function visibleLinks(
  links: NavLink[],
  { canSell, isAdmin }: { canSell: boolean; isAdmin: boolean },
): NavLink[] {
  return links.filter(
    (l) => (!l.sellerOnly || canSell) && (!l.adminOnly || isAdmin),
  );
}
