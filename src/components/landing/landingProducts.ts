import type { Product } from "@/lib/types";
import { ASSETS } from "./assets";

/// Données et conversion des produits pour la grille de la page d'accueil.
/// Module « serveur » (sans directive "use client") : il est importé à la fois
/// par page.tsx (rendu serveur) et par Catalogue.tsx (composant client).

export type BadgeTone = "orange" | "ink" | "vert" | "sun";
export type TagTone = "neg" | "flash" | "auction";

export type LandingProduct = {
  image: string;
  alt: string;
  city: string;
  title: string;
  price: string;
  oldPrice?: string;
  badge?: { label: string; tone: BadgeTone };
  tag?: { label: string; tone: TagTone };
};

const fmtF = (n: number) => `${n.toLocaleString("fr-FR")} F`;

export const SAMPLE_PRODUCTS: LandingProduct[] = [
  {
    image: ASSETS.products.sneakers,
    alt: "Sneakers Air Fusion blanches et orange",
    city: "Abidjan",
    title: "Sneakers Air Fusion",
    price: fmtF(45000),
    oldPrice: fmtF(60000),
    badge: { label: "−25%", tone: "orange" },
    tag: { label: "Négociable", tone: "neg" },
  },
  {
    image: ASSETS.products.phone,
    alt: "Smartphone Nova X6",
    city: "Bouaké",
    title: "Smartphone Nova X6 — 128 Go",
    price: fmtF(89000),
    oldPrice: fmtF(110000),
    badge: { label: "Vente flash", tone: "ink" },
    tag: { label: "Flash", tone: "flash" },
  },
  {
    image: ASSETS.products.wax,
    alt: "Pagne wax premium motifs géométriques",
    city: "Yamoussoukro",
    title: "Pagne Wax Premium — 6 yards",
    price: fmtF(18500),
    badge: { label: "Coup de cœur", tone: "vert" },
    tag: { label: "Négociable", tone: "neg" },
  },
  {
    image: ASSETS.products.headphones,
    alt: "Casque audio sans fil bass boost",
    city: "San-Pédro",
    title: "Casque BassBoost Pro",
    price: fmtF(24500),
    oldPrice: fmtF(35000),
    badge: { label: "−30%", tone: "orange" },
    tag: { label: "Négociable", tone: "neg" },
  },
  {
    image: ASSETS.products.bag,
    alt: "Sac à main cuir tressé détails wax",
    city: "Abidjan",
    title: "Sac Cuir & Wax « Assinie »",
    price: fmtF(32000),
    badge: { label: "Artisanal", tone: "sun" },
    tag: { label: "Négociable", tone: "neg" },
  },
  {
    image: ASSETS.products.watch,
    alt: "Montre chronographe or et verte",
    city: "Abidjan",
    title: "Chronographe « Grand-Bassam »",
    price: fmtF(87500),
    badge: { label: "Enchère", tone: "ink" },
    tag: { label: "Fin", tone: "auction" },
  },
  {
    image: ASSETS.products.sneakers,
    alt: "Baskets Urban Retro blanches",
    city: "Korhogo",
    title: "Baskets Urban Retro",
    price: fmtF(21500),
    oldPrice: fmtF(28000),
    badge: { label: "−23%", tone: "orange" },
    tag: { label: "Négociable", tone: "neg" },
  },
  {
    image: ASSETS.products.wax,
    alt: "Pagne wax « Édition Royale »",
    city: "Daloa",
    title: "Pagne Wax « Édition Royale »",
    price: fmtF(26000),
    badge: { label: "Édition limitée", tone: "sun" },
    tag: { label: "Négociable", tone: "neg" },
  },
  {
    image: ASSETS.products.bag,
    alt: "Sac à dos wax « Kintampo »",
    city: "Grand-Bassam",
    title: "Sac à dos Wax « Kintampo »",
    price: fmtF(19900),
    oldPrice: fmtF(24000),
    badge: { label: "−17%", tone: "orange" },
    tag: { label: "Négociable", tone: "neg" },
  },
];

/// Convertit un produit réel du catalogue en carte de la page d'accueil.
export function toLandingProduct(product: Product): LandingProduct {
  const image =
    product.product_images?.[0]?.url ?? ASSETS.products.sneakers;
  let badge: LandingProduct["badge"];
  if (product.is_flash) {
    badge = { label: "Vente flash", tone: "ink" };
  } else if (product.compare_at_price) {
    const pct = Math.round(
      (1 - product.price / product.compare_at_price) * 100,
    );
    badge = { label: `−${pct}%`, tone: "orange" };
  } else {
    badge = { label: "Coup de cœur", tone: "vert" };
  }
  return {
    image,
    alt: product.title,
    city: product.city ?? "Abidjan",
    title: product.title,
    price: fmtF(product.price),
    oldPrice: product.compare_at_price
      ? fmtF(product.compare_at_price)
      : undefined,
    badge,
    tag: product.is_flash
      ? { label: "Flash", tone: "flash" }
      : { label: "Négociable", tone: "neg" },
  };
}