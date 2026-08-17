"use client";

import { ShowcaseCarousel } from "./ShowcaseCarousel";
import { CategoryShowcase } from "./CategoryShowcase";

/* ------------------------------------------------------------------ */
/* Données produits (mode & accessoires)                               */
/* ------------------------------------------------------------------ */

interface ModeProduct {
  id: string;
  title: string;
  rating: number;
  reviews: number;
  price: string;
  decimals: string;
  originalPrice?: string;
  image: string;
}

const PRODUCTS: ModeProduct[] = [
  {
    id: "md-1",
    title: "Chemise en pagne Wax",
    rating: 4.8,
    reviews: 312,
    price: "14 500",
    decimals: "00",
    originalPrice: "17 000",
    image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=400&fit=crop",
  },
  {
    id: "md-2",
    title: "Robe fluide à motifs",
    rating: 4.7,
    reviews: 258,
    price: "18 900",
    decimals: "00",
    originalPrice: "22 400",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=400&fit=crop",
  },
  {
    id: "md-3",
    title: "Pantalon taille haute",
    rating: 4.5,
    reviews: 174,
    price: "11 200",
    decimals: "00",
    image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=400&fit=crop",
  },
  {
    id: "md-4",
    title: "Blazer structuré",
    rating: 4.6,
    reviews: 143,
    price: "27 800",
    decimals: "00",
    originalPrice: "31 500",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
  },
  {
    id: "md-5",
    title: "Pagne Wax Uniwax",
    rating: 4.9,
    reviews: 521,
    price: "16 400",
    decimals: "00",
    image: "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=400&h=400&fit=crop",
  },
  {
    id: "md-6",
    title: "Top en maille",
    rating: 4.6,
    reviews: 198,
    price: "9 800",
    decimals: "00",
    originalPrice: "12 000",
    image: "https://images.unsplash.com/photo-1434389677669-e08b4cda3a30?w=400&h=400&fit=crop",
  },
  {
    id: "md-7",
    title: "Sac à main cuir",
    rating: 4.8,
    reviews: 402,
    price: "24 900",
    decimals: "00",
    originalPrice: "29 500",
    image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop",
  },
  {
    id: "md-8",
    title: "Sac bandoulière",
    rating: 4.7,
    reviews: 289,
    price: "19 500",
    decimals: "00",
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop",
  },
  {
    id: "md-9",
    title: "Montre classique",
    rating: 4.9,
    reviews: 356,
    price: "32 000",
    decimals: "00",
    originalPrice: "38 000",
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop",
  },
  {
    id: "md-10",
    title: "Lunettes de soleil",
    rating: 4.6,
    reviews: 214,
    price: "7 900",
    decimals: "00",
    image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop",
  },
  {
    id: "md-11",
    title: "Baskets tendance",
    rating: 4.7,
    reviews: 467,
    price: "21 500",
    decimals: "00",
    originalPrice: "25 000",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop",
  },
  {
    id: "md-12",
    title: "Sandales artisanales",
    rating: 4.5,
    reviews: 176,
    price: "13 800",
    decimals: "00",
    image: "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=400&h=400&fit=crop",
  },
];

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

function ProductCard({ product }: { product: ModeProduct }) {
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
        <h3 className="font-display font-bold leading-snug">{product.title}</h3>
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
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function ModeEtAccessoires() {
  return (
    <CategoryShowcase
      eyebrow="Style & tendances"
      titleLead="Nos "
      marker="Mode & Accessoires"
      accent="orange"
      image="/assets/sections/favbrands.jpg"
      imageAlt="Mode et accessoires"
      exploreHref="/play/search?category=accessoires"
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
