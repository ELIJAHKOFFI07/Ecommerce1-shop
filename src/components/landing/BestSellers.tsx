"use client";

import { CircleCheck, Info } from "lucide-react";
import { formatFcfa } from "@/lib/types";
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
  price: number;
  originalPrice?: number;
  savings?: number;
  lowestPrice?: number;
  image: string;
}

const PRODUCTS: BestSellerProduct[] = [
  {
    id: "1",
    title: "AirPods 4 (ANC) (2024)",
    condition: "Très bon état",
    rating: 4.6,
    reviews: 827,
    price: 83300,
    originalPrice: 91200,
    savings: 7900,
    lowestPrice: 91200,
    image: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=400&h=400&fit=crop",
  },
  {
    id: "2",
    title: "Switch",
    condition: "État correct · 32 Go · Rouge/Bleu",
    rating: 4.1,
    reviews: 704,
    price: 117400,
    originalPrice: 124000,
    savings: 6600,
    lowestPrice: 124000,
    image: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=400&h=400&fit=crop",
  },
  {
    id: "3",
    title: "Xbox Series S",
    condition: "État correct · 500 Go",
    rating: 4.5,
    reviews: 408,
    price: 198100,
    originalPrice: 219700,
    savings: 21600,
    lowestPrice: 219700,
    image: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=400&h=400&fit=crop",
  },
  {
    id: "4",
    title: "MacBook Air M2",
    condition: "Excellent état · 256 Go",
    rating: 4.8,
    reviews: 1203,
    price: 557000,
    originalPrice: 655300,
    savings: 98300,
    lowestPrice: 655300,
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop",
  },
  {
    id: "5",
    title: 'iPad Pro 11"',
    condition: "Très bon état · 128 Go",
    rating: 4.7,
    reviews: 567,
    price: 360100,
    originalPrice: 458500,
    savings: 98400,
    lowestPrice: 458500,
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop",
  },
  {
    id: "6",
    title: "Samsung Galaxy S24",
    condition: "Excellent état · 128 Go",
    rating: 4.4,
    reviews: 892,
    price: 301100,
    originalPrice: 392900,
    savings: 91800,
    lowestPrice: 392900,
    image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&h=400&fit=crop",
  },
  {
    id: "7",
    title: "PS5 DualSense",
    condition: "Neuf scellé",
    rating: 4.9,
    reviews: 1540,
    price: 42600,
    originalPrice: 49200,
    savings: 6600,
    lowestPrice: 49200,
    image: "https://images.unsplash.com/photo-1606144842614-216246940583?w=400&h=400&fit=crop",
  },
  {
    id: "8",
    title: "Apple Watch SE",
    condition: "Très bon état · 40 mm",
    rating: 4.6,
    reviews: 634,
    price: 124000,
    originalPrice: 163300,
    savings: 39300,
    lowestPrice: 163300,
    image: "https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=400&h=400&fit=crop",
  },
  {
    id: "9",
    title: "Galaxy Tab S9",
    condition: "Bon état · 128 Go",
    rating: 4.3,
    reviews: 321,
    price: 228900,
    originalPrice: 294500,
    savings: 65600,
    lowestPrice: 294500,
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop",
  },
  {
    id: "10",
    title: "Sony WH-1000XM5",
    condition: "Excellent état",
    rating: 4.8,
    reviews: 2100,
    price: 150200,
    originalPrice: 228900,
    savings: 78700,
    lowestPrice: 228900,
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
          className={`h-3.5 w-3.5 ${s <= Math.round(rating) ? "text-foreground" : "text-foreground/20"}`}
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
    <div className="card-hover card-hard-sm group w-[260px] shrink-0 overflow-hidden rounded-3xl bg-card sm:w-[280px]">
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
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-border bg-secondary px-2.5 py-1 font-display text-xs font-extrabold text-secondary-foreground">
            <CircleCheck className="h-3.5 w-3.5" />
            Baisse de prix
          </span>
        </div>
        <h3 className="font-display font-bold leading-snug">{product.title}</h3>
        <p className="mt-0.5 text-sm text-foreground/50">{product.condition}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <Stars rating={product.rating} />
          <span className="text-xs font-semibold text-foreground/50">
            {product.rating}/5 ({product.reviews.toLocaleString()})
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-lg font-extrabold text-accent-dark">
            {formatFcfa(product.price)}
          </span>
          {product.originalPrice && (
            <span className="text-sm font-semibold text-foreground/40 line-through">
              {formatFcfa(product.originalPrice)}
            </span>
          )}
        </div>
        {product.savings && (
          <p className="mt-1 text-xs font-bold text-[#1a8c4e]">
            Économisez {formatFcfa(product.savings)}
          </p>
        )}
        {product.lowestPrice && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-foreground/40">
            Prix le plus bas : {formatFcfa(product.lowestPrice)}
            <Info className="h-3 w-3" />
          </p>
        )}
        <button className="mt-3 w-full rounded-full border-2 border-border bg-card px-4 py-2.5 font-display text-sm font-bold transition-colors hover:bg-foreground hover:text-background">
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
