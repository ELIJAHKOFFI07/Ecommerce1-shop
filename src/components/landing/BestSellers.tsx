"use client";

import { CircleCheck, Info } from "lucide-react";
import { CategoryShowcase } from "./CategoryShowcase";
import { ShowcaseCarousel } from "./ShowcaseCarousel";

/* ------------------------------------------------------------------ */
/* Données produits                                                    */
/* ------------------------------------------------------------------ */

interface BestSellerProduct {
  id: string;
  title: string;
  condition: string;
  rating: number;
  reviews: number;
  price: string;
  decimals: string;
  originalPrice?: string;
  savings?: string;
  lowestPrice?: string;
  image: string;
}

const PRODUCTS: BestSellerProduct[] = [
  {
    id: "1",
    title: "AirPods 4 (ANC) (2024)",
    condition: "Très bon état",
    rating: 4.6,
    reviews: 827,
    price: "127",
    decimals: "00",
    originalPrice: "139",
    savings: "12,00",
    lowestPrice: "139,00",
    image: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=400&h=400&fit=crop",
  },
  {
    id: "2",
    title: "Switch",
    condition: "État correct · 32 Go · Rouge/Bleu",
    rating: 4.1,
    reviews: 704,
    price: "179",
    decimals: "00",
    originalPrice: "189",
    savings: "10,00",
    lowestPrice: "189,00",
    image: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=400&h=400&fit=crop",
  },
  {
    id: "3",
    title: "Xbox Series S",
    condition: "État correct · 500 Go",
    rating: 4.5,
    reviews: 408,
    price: "302",
    decimals: "00",
    originalPrice: "335",
    savings: "33,00",
    lowestPrice: "335,00",
    image: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=400&h=400&fit=crop",
  },
  {
    id: "4",
    title: "MacBook Air M2",
    condition: "Excellent état · 256 Go",
    rating: 4.8,
    reviews: 1203,
    price: "849",
    decimals: "00",
    originalPrice: "999",
    savings: "150,00",
    lowestPrice: "999,00",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop",
  },
  {
    id: "5",
    title: 'iPad Pro 11"',
    condition: "Très bon état · 128 Go",
    rating: 4.7,
    reviews: 567,
    price: "549",
    decimals: "00",
    originalPrice: "699",
    savings: "150,00",
    lowestPrice: "699,00",
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop",
  },
  {
    id: "6",
    title: "Samsung Galaxy S24",
    condition: "Excellent état · 128 Go",
    rating: 4.4,
    reviews: 892,
    price: "459",
    decimals: "00",
    originalPrice: "599",
    savings: "140,00",
    lowestPrice: "599,00",
    image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&h=400&fit=crop",
  },
  {
    id: "7",
    title: "PS5 DualSense",
    condition: "Neuf scellé",
    rating: 4.9,
    reviews: 1540,
    price: "65",
    decimals: "00",
    originalPrice: "75",
    savings: "10,00",
    lowestPrice: "75,00",
    image: "https://images.unsplash.com/photo-1606144842614-216246940583?w=400&h=400&fit=crop",
  },
  {
    id: "8",
    title: "Apple Watch SE",
    condition: "Très bon état · 40 mm",
    rating: 4.6,
    reviews: 634,
    price: "189",
    decimals: "00",
    originalPrice: "249",
    savings: "60,00",
    lowestPrice: "249,00",
    image: "https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=400&h=400&fit=crop",
  },
  {
    id: "9",
    title: "Galaxy Tab S9",
    condition: "Bon état · 128 Go",
    rating: 4.3,
    reviews: 321,
    price: "349",
    decimals: "00",
    originalPrice: "449",
    savings: "100,00",
    lowestPrice: "449,00",
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop",
  },
  {
    id: "10",
    title: "Sony WH-1000XM5",
    condition: "Excellent état",
    rating: 4.8,
    reviews: 2100,
    price: "229",
    decimals: "00",
    originalPrice: "349",
    savings: "120,00",
    lowestPrice: "349,00",
    image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&h=400&fit=crop",
  },
];

/* ------------------------------------------------------------------ */
/* Défilement                                                           */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Sous-composants                                                     */
/* ------------------------------------------------------------------ */

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`h-3.5 w-3.5 ${s <= Math.round(rating) ? "text-ink" : "text-ink/20"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function ProductCard({ product }: { product: BestSellerProduct }) {
  return (
    <div className="card-hover group w-[260px] shrink-0 overflow-hidden rounded-3xl border-2 border-ink bg-paper shadow-hard-sm sm:w-[280px]">
      <div className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.title}
          className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <div className="mb-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-vert px-2.5 py-1 font-display text-xs font-extrabold text-white">
            <CircleCheck className="h-3.5 w-3.5" />
            Baisse de prix
          </span>
        </div>
        <h3 className="font-display font-bold leading-snug">{product.title}</h3>
        <p className="mt-0.5 text-sm text-ink/50">{product.condition}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <Stars rating={product.rating} />
          <span className="text-xs font-semibold text-ink/50">
            {product.rating}/5 ({product.reviews.toLocaleString()})
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-lg font-extrabold text-orange-deep">
            {product.price}
          </span>
          <sup className="text-sm font-bold text-orange-deep">.{product.decimals} €</sup>
          {product.originalPrice && (
            <span className="text-sm font-semibold text-ink/40 line-through">
              {product.originalPrice},00 €
            </span>
          )}
        </div>
        {product.savings && (
          <p className="mt-1 text-xs font-bold text-[#1a8c4e]">
            Économisez {product.savings} €
          </p>
        )}
        {product.lowestPrice && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink/40">
            Prix le plus bas : {product.lowestPrice} €
            <Info className="h-3 w-3" />
          </p>
        )}
        <button className="mt-3 w-full rounded-full border-2 border-ink bg-paper px-4 py-2.5 font-display text-sm font-bold transition-colors hover:bg-ink hover:text-cream">
          + Ajouter au panier
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function PhonesAndDevices() {
  return (
    <CategoryShowcase
      eyebrow="Catégorie en vedette"
      titleLead="Nos "
      marker="Téléphones & Appareils"
      accent="vert"
      image="/assets/sections/bestsellers.jpg"
      imageAlt="Téléphones et appareils"
      exploreHref="/play/search?category=telephones"
      exploreLabel="Voir la catégorie"
    >
      <ShowcaseCarousel>
        {PRODUCTS.map((p) => (
          <div key={p.id} className="snap-start">
            <ProductCard product={p} />
          </div>
        ))}
      </ShowcaseCarousel>
    </CategoryShowcase>
  );
}
