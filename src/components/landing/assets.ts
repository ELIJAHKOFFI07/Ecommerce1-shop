/// Chemins d'accès aux images de la maquette « dreamOnSteroid ».
///
/// Les fichiers vivent dans `/public/assets` (copiés depuis le dossier
/// `dreamOnSteroid/assets`). Centraliser ici les chemins évite de dupliquer
/// des chaînes dans les composants : pour renommer ou remplacer une image, on
/// ne touche qu'à ce fichier.

export const ASSETS = {
  hero: "/assets/hero.png",
  seller: "/assets/seller.png",
  products: {
    sneakers: "/assets/product-sneakers.png",
    phone: "/assets/product-phone.png",
    wax: "/assets/product-wax.png",
    headphones: "/assets/product-headphones.png",
    bag: "/assets/product-bag.png",
    watch: "/assets/product-watch.png",
  },
} as const;
