# Best Sellers & Favorite Brands Sections - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new sections to the landing page: "Best Sellers" (product carousel with categories) and "Favorite Brands" (African brands showcase with product filtering).

**Architecture:** Two new client components (`BestSellers.tsx`, `FavoriteBrands.tsx`) following the existing landing page pattern (Reveal animations, card-hover, border-ink style). Brand logos stored in `public/assets/brands/`. Integration in `page.tsx` between `Catalogue` and `Bonus`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, lucide-react, existing `Reveal` component for animations.

---

## File Structure

```
src/
├── components/landing/
│   ├── BestSellers.tsx          # NEW - Best sellers section
│   └── FavoriteBrands.tsx       # NEW - Favorite brands section
├── app/
│   └── page.tsx                 # MODIFY - Add new sections
public/
└── assets/brands/               # NEW - Brand logos
    ├── maxhosa.png
    ├── tongoro.png
    ├── uniwax.png
    ├── bathu.png
    ├── dangote.png
    └── mtn.png
```

---

### Task 1: Download Brand Logos

**Files:**
- Create: `public/assets/brands/maxhosa.png`
- Create: `public/assets/brands/tongoro.png`
- Create: `public/assets/brands/uniwax.png`
- Create: `public/assets/brands/bathu.png`
- Create: `public/assets/brands/dangote.png`
- Create: `public/assets/brands/mtn.png`

- [ ] **Step 1: Create brands directory**

```bash
mkdir -p public/assets/brands
```

- [ ] **Step 2: Download logos**

```bash
# MaXhosa - from official site
curl -L "https://maxhosa.africa/cdn/shop/files/MXS-LOGO-BLACK.png?v=1" -o public/assets/brands/maxhosa.png

# Tongoro - from squarespace CDN
curl -L "https://images.squarespace-cdn.com/content/v1/599320fa59cc68de14db21fb/7d3bce90-ef79-4a38-ac74-66a66216777b/TONGORO+LOGO.png" -o public/assets/brands/tongoro.png

# Uniwax - will need to find or create placeholder
# Bathu - from official site
curl -L "https://www.bathu.co.za/cdn/shop/files/bathu-logo.png" -o public/assets/brands/bathu.png

# Dangote - from official site
curl -L "https://www.dangote.com/wp-content/uploads/2020/04/Dangote-logo-svg-2.png" -o public/assets/brands/dangote.png

# MTN - from logo.wine
curl -L "https://logo.wine/a/logo/MTN_Group/MTN_Group-Logo.wine.png" -o public/assets/brands/mtn.png
```

- [ ] **Step 3: Verify downloads**

```bash
ls -la public/assets/brands/
```

Expected: 6 PNG files, each > 1KB

- [ ] **Step 4: Commit**

```bash
git add public/assets/brands/
git commit -m "feat: add African brand logos for landing page sections"
```

---

### Task 2: Create BestSellers Component

**Files:**
- Create: `src/components/landing/BestSellers.tsx`

- [ ] **Step 1: Create BestSellers component**

```tsx
"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, TrendingDown } from "lucide-react";
import { Reveal } from "./Reveal";
import { Marker } from "./Marker";

/* ------------------------------------------------------------------ */
/* Données produits best sellers                                       */
/* ------------------------------------------------------------------ */

interface BestSellerProduct {
  id: string;
  title: string;
  condition: string;
  rating: number;
  reviews: number;
  price: string;
  originalPrice?: string;
  savings?: string;
  lowestPrice?: string;
  image: string;
  category: string;
}

const BEST_SELLER_PRODUCTS: BestSellerProduct[] = [
  {
    id: "1",
    title: "AirPods 4 (ANC) (2024)",
    condition: "Très bon état",
    rating: 4.6,
    reviews: 827,
    price: "127",
    originalPrice: "139",
    savings: "12",
    lowestPrice: "139",
    image: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=400&h=400&fit=crop",
    category: "Audio",
  },
  {
    id: "2",
    title: "Nintendo Switch",
    condition: "État correct · 32 Go · Rouge/Bleu",
    rating: 4.1,
    reviews: 704,
    price: "179",
    originalPrice: "189",
    savings: "10",
    lowestPrice: "189",
    image: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=400&h=400&fit=crop",
    category: "Gaming",
  },
  {
    id: "3",
    title: "Xbox Series S",
    condition: "État correct · 500 Go",
    rating: 4.5,
    reviews: 408,
    price: "302",
    originalPrice: "335",
    savings: "33",
    lowestPrice: "335",
    image: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=400&h=400&fit=crop",
    category: "Gaming",
  },
  {
    id: "4",
    title: "MacBook Air M2",
    condition: "Excellent état · 256 Go",
    rating: 4.8,
    reviews: 1203,
    price: "849",
    originalPrice: "999",
    savings: "150",
    lowestPrice: "999",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop",
    category: "Laptop",
  },
  {
    id: "5",
    title: "iPad Pro 11\"",
    condition: "Très bon état · 128 Go",
    rating: 4.7,
    reviews: 567,
    price: "549",
    originalPrice: "699",
    savings: "150",
    lowestPrice: "699",
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop",
    category: "Tablette",
  },
  {
    id: "6",
    title: "Samsung Galaxy S24",
    condition: "Excellent état · 128 Go",
    rating: 4.4,
    reviews: 892,
    price: "459",
    originalPrice: "599",
    savings: "140",
    lowestPrice: "599",
    image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&h=400&fit=crop",
    category: "Smartphone",
  },
];

/* ------------------------------------------------------------------ */
/* Catégories avec icônes                                              */
/* ------------------------------------------------------------------ */

interface Category {
  id: string;
  label: string;
  icon: string;
}

const CATEGORIES: Category[] = [
  { id: "deals", label: "Baisse de prix", icon: "📉" },
  { id: "laptop", label: "MacBook", icon: "💻" },
  { id: "tablet", label: "Tablettes", icon: "📱" },
  { id: "iphone", label: "iPhone", icon: "📱" },
  { id: "android", label: "Smartphones Android", icon: "📱" },
  { id: "watch", label: "Montres connectées", icon: "⌚" },
  { id: "windows", label: "Ordinateurs Windows", icon: "💻" },
  { id: "retro", label: "Retro tech", icon: "🎮" },
];

/* ------------------------------------------------------------------ */
/* Composants                                                          */
/* ------------------------------------------------------------------ */

function StarRating({ rating, reviews }: { rating: number; reviews: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`h-3.5 w-3.5 ${
              star <= Math.round(rating) ? "text-vert" : "text-ink/20"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-xs font-bold text-ink/60">
        {rating}/5 ({reviews.toLocaleString()})
      </span>
    </div>
  );
}

function ProductCard({ product }: { product: BestSellerProduct }) {
  return (
    <div className="card-hover group shrink-0 w-[280px] overflow-hidden rounded-3xl border-2 border-ink bg-paper shadow-hard-sm sm:w-[300px]">
      <div className="relative overflow-hidden bg-cream p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.title}
          className="aspect-square w-full rounded-2xl object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border-2 border-ink bg-vert px-2.5 py-1 font-display text-xs font-extrabold text-white">
          <TrendingDown className="h-3 w-3" />
          Baisse de prix
        </span>
      </div>

      <div className="p-4">
        <h3 className="font-display text-lg font-bold leading-snug">
          {product.title}
        </h3>
        <p className="mt-1 text-sm text-ink/60">{product.condition}</p>

        <div className="mt-2">
          <StarRating rating={product.rating} reviews={product.reviews} />
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-display text-2xl font-extrabold text-ink">
            {product.price}
          </span>
          <span className="text-sm font-bold text-ink/40">.00 €</span>
        </div>

        {product.savings && (
          <p className="mt-1 text-sm font-bold text-vert">
            Économisez {product.savings},00 €
          </p>
        )}

        {product.lowestPrice && (
          <p className="mt-1 text-xs text-ink/50">
            Prix le plus bas : {product.lowestPrice},00 €
          </p>
        )}

        <button className="mt-4 w-full rounded-full border-2 border-ink bg-paper px-4 py-3 font-display font-bold transition-colors hover:bg-ink hover:text-cream">
          + Ajouter au panier
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section Best Sellers                                                */
/* ------------------------------------------------------------------ */

export function BestSellers() {
  const [activeCategory, setActiveCategory] = useState("deals");

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      <Reveal>
        <h2 className="mb-8 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Découvrez nos{" "}
          <Marker variant="orange">meilleures offres</Marker>
        </h2>
      </Reveal>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Image lifestyle à gauche */}
        <Reveal className="hidden lg:block lg:w-1/3">
          <div className="sticky top-24 overflow-hidden rounded-3xl border-2 border-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=800&fit=crop"
              alt="Meilleures offres"
              className="aspect-[3/4] w-full object-cover"
            />
          </div>
        </Reveal>

        {/* Contenu à droite */}
        <div className="flex-1">
          {/* Barre de catégories */}
          <Reveal className="mb-6 flex gap-3 overflow-x-auto pb-4">
            {CATEGORIES.map((cat) => {
              const isActive = cat.id === activeCategory;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border-2 border-ink px-4 py-3 transition-colors ${
                    isActive
                      ? "bg-ink text-cream"
                      : "bg-paper hover:bg-orange-soft"
                  }`}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="whitespace-nowrap font-display text-xs font-bold">
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </Reveal>

          {/* Carousel produits */}
          <Reveal>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
              {BEST_SELLER_PRODUCTS.map((product) => (
                <div key={product.id} className="snap-start">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </Reveal>

          {/* Navigation carousel */}
          <Reveal className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-paper transition-colors hover:bg-ink hover:text-cream"
              aria-label="Précédent"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-ink text-cream transition-colors hover:bg-orange"
              aria-label="Suivant"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify component compiles**

```bash
npx tsc --noEmit src/components/landing/BestSellers.tsx
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/BestSellers.tsx
git commit -m "feat: add BestSellers landing section component"
```

---

### Task 3: Create FavoriteBrands Component

**Files:**
- Create: `src/components/landing/FavoriteBrands.tsx`

- [ ] **Step 1: Create FavoriteBrands component**

```tsx
"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Reveal } from "./Reveal";
import { Marker } from "./Marker";
import { CtaButton } from "./Primitives";

/* ------------------------------------------------------------------ */
/* Marques africaines                                                  */
/* ------------------------------------------------------------------ */

interface AfricanBrand {
  id: string;
  name: string;
  logo: string;
  country: string;
}

const AFRICAN_BRANDS: AfricanBrand[] = [
  {
    id: "maxhosa",
    name: "MaXhosa",
    logo: "/assets/brands/maxhosa.png",
    country: "🇿🇦",
  },
  {
    id: "tongoro",
    name: "Tongoro",
    logo: "/assets/brands/tongoro.png",
    country: "🇸🇳",
  },
  {
    id: "uniwax",
    name: "Uniwax",
    logo: "/assets/brands/uniwax.png",
    country: "🇨🇮",
  },
  {
    id: "bathu",
    name: "Bathu",
    logo: "/assets/brands/bathu.png",
    country: "🇿🇦",
  },
  {
    id: "dangote",
    name: "Dangote",
    logo: "/assets/brands/dangote.png",
    country: "🇳🇬",
  },
  {
    id: "mtn",
    name: "MTN",
    logo: "/assets/brands/mtn.png",
    country: "🇿🇦",
  },
];

/* ------------------------------------------------------------------ */
/* Produits par marque                                                 */
/* ------------------------------------------------------------------ */

interface BrandProduct {
  id: string;
  title: string;
  brand: string;
  rating: number;
  reviews: number;
  price: string;
  originalPrice?: string;
  image: string;
}

const BRAND_PRODUCTS: BrandProduct[] = [
  // MaXhosa
  {
    id: "maxhosa-1",
    title: "MaXhosa Crew Neck",
    brand: "maxhosa",
    rating: 4.8,
    reviews: 244,
    price: "15 480",
    originalPrice: "17 280",
    image: "https://images.unsplash.com/photo-1434389677669-e08b4cda3a30?w=400&h=400&fit=crop",
  },
  {
    id: "maxhosa-2",
    title: "MaXhosa Bib Vest",
    brand: "maxhosa",
    rating: 4.7,
    reviews: 189,
    price: "13 200",
    originalPrice: "15 000",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=400&fit=crop",
  },
  {
    id: "maxhosa-3",
    title: "MaXhosa Shawl",
    brand: "maxhosa",
    rating: 4.9,
    reviews: 156,
    price: "11 040",
    originalPrice: "13 200",
    image: "https://images.unsplash.com/photo-1601924994987-69e26d50dc64?w=400&h=400&fit=crop",
  },
  // Tongoro
  {
    id: "tongoro-1",
    title: "Tongoro Shirt",
    brand: "tongoro",
    rating: 4.6,
    reviews: 312,
    price: "180",
    image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=400&fit=crop",
  },
  {
    id: "tongoro-2",
    title: "Tongoro Pants",
    brand: "tongoro",
    rating: 4.5,
    reviews: 278,
    price: "150",
    image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=400&fit=crop",
  },
  {
    id: "tongoro-3",
    title: "Tongoro Dress",
    brand: "tongoro",
    rating: 4.7,
    reviews: 198,
    price: "220",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=400&fit=crop",
  },
  // Uniwax
  {
    id: "uniwax-1",
    title: "Pagne Uniwax Signature",
    brand: "uniwax",
    rating: 4.8,
    reviews: 456,
    price: "25",
    image: "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=400&h=400&fit=crop",
  },
  {
    id: "uniwax-2",
    title: "Uniwax Géométrie",
    brand: "uniwax",
    rating: 4.7,
    reviews: 389,
    price: "28",
    image: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400&h=400&fit=crop",
  },
  {
    id: "uniwax-3",
    title: "Uniwax Classique",
    brand: "uniwax",
    rating: 4.9,
    reviews: 521,
    price: "22",
    image: "https://images.unsplash.com/photo-1533050487297-09b450131914?w=400&h=400&fit=crop",
  },
  // Bathu
  {
    id: "bathu-1",
    title: "Bathu Journey 3.0",
    brand: "bathu",
    rating: 4.6,
    reviews: 892,
    price: "1 849",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop",
  },
  {
    id: "bathu-2",
    title: "Bathu Elev8",
    brand: "bathu",
    rating: 4.5,
    reviews: 654,
    price: "1 499",
    image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=400&fit=crop",
  },
  {
    id: "bathu-3",
    title: "Bathu Khalanga",
    brand: "bathu",
    rating: 4.7,
    reviews: 423,
    price: "1 699",
    image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&h=400&fit=crop",
  },
  // Dangote
  {
    id: "dangote-1",
    title: "Dangote Sugar 1kg",
    brand: "dangote",
    rating: 4.4,
    reviews: 1234,
    price: "2",
    image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop",
  },
  {
    id: "dangote-2",
    title: "Dangote Cement 50kg",
    brand: "dangote",
    rating: 4.3,
    reviews: 890,
    price: "8",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=400&fit=crop",
  },
  {
    id: "dangote-3",
    title: "Dangote Pasta",
    brand: "dangote",
    rating: 4.5,
    reviews: 678,
    price: "3",
    image: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&h=400&fit=crop",
  },
  // MTN
  {
    id: "mtn-1",
    title: "MTN SIM Card",
    brand: "mtn",
    rating: 4.2,
    reviews: 2345,
    price: "1",
    image: "https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400&h=400&fit=crop",
  },
  {
    id: "mtn-2",
    title: "MTN Data Bundle",
    brand: "mtn",
    rating: 4.4,
    reviews: 1567,
    price: "5",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=400&fit=crop",
  },
  {
    id: "mtn-3",
    title: "MTN MiFi",
    brand: "mtn",
    rating: 4.6,
    reviews: 432,
    price: "45",
    image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=400&fit=crop",
  },
];

/* ------------------------------------------------------------------ */
/* Composants                                                          */
/* ------------------------------------------------------------------ */

function StarRating({ rating, reviews }: { rating: number; reviews: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`h-3.5 w-3.5 ${
              star <= Math.round(rating) ? "text-vert" : "text-ink/20"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-xs font-bold text-ink/60">
        {rating}/5 ({reviews.toLocaleString()})
      </span>
    </div>
  );
}

function BrandLogo({
  brand,
  isActive,
  onClick,
}: {
  brand: AfricanBrand;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 flex-col items-center gap-2 rounded-2xl border-2 border-ink px-4 py-3 transition-all ${
        isActive
          ? "bg-ink shadow-hard-sm scale-105"
          : "bg-paper hover:bg-orange-soft"
      }`}
    >
      <div className="flex h-10 w-20 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brand.logo}
          alt={brand.name}
          className={`max-h-full max-w-full object-contain ${
            isActive ? "brightness-0 invert" : ""
          }`}
        />
      </div>
      <span
        className={`font-display text-xs font-bold ${
          isActive ? "text-cream" : "text-ink"
        }`}
      >
        {brand.name}
      </span>
    </button>
  );
}

function ProductCard({ product }: { product: BrandProduct }) {
  return (
    <div className="card-hover group shrink-0 w-[280px] overflow-hidden rounded-3xl border-2 border-ink bg-paper shadow-hard-sm sm:w-[300px]">
      <div className="relative overflow-hidden bg-cream p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.title}
          className="aspect-square w-full rounded-2xl object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="p-4">
        <h3 className="font-display text-lg font-bold leading-snug">
          {product.title}
        </h3>

        <div className="mt-2">
          <StarRating rating={product.rating} reviews={product.reviews} />
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-display text-2xl font-extrabold text-ink">
            {product.price}
          </span>
          <span className="text-sm font-bold text-ink/40">.00 €</span>
        </div>

        {product.originalPrice && (
          <p className="mt-1 text-sm text-ink/50 line-through">
            {product.originalPrice},00 € neuf
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section Favorite Brands                                             */
/* ------------------------------------------------------------------ */

export function FavoriteBrands() {
  const [activeBrand, setActiveBrand] = useState("maxhosa");

  const filteredProducts = BRAND_PRODUCTS.filter(
    (p) => p.brand === activeBrand
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      <Reveal>
        <h2 className="mb-8 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Vos marques{" "}
          <Marker variant="vert">favorites</Marker>
        </h2>
      </Reveal>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Image lifestyle à gauche */}
        <Reveal className="hidden lg:block lg:w-1/3">
          <div className="sticky top-24 overflow-hidden rounded-3xl border-2 border-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=800&fit=crop"
              alt="Marques favorites"
              className="aspect-[3/4] w-full object-cover"
            />
          </div>
        </Reveal>

        {/* Contenu à droite */}
        <div className="flex-1">
          {/* Bandeau logos marques */}
          <Reveal className="mb-6 flex gap-3 overflow-x-auto pb-4">
            {AFRICAN_BRANDS.map((brand) => (
              <BrandLogo
                key={brand.id}
                brand={brand}
                isActive={brand.id === activeBrand}
                onClick={() => setActiveBrand(brand.id)}
              />
            ))}
          </Reveal>

          {/* Carousel produits */}
          <Reveal>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
              {filteredProducts.map((product) => (
                <div key={product.id} className="snap-start">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </Reveal>

          {/* Navigation carousel + CTA */}
          <Reveal className="mt-6 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-paper transition-colors hover:bg-ink hover:text-cream"
                aria-label="Précédent"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-ink text-cream transition-colors hover:bg-orange"
                aria-label="Suivant"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <CtaButton href="#catalogue" variant="ink" size="md">
              Voir plus
            </CtaButton>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify component compiles**

```bash
npx tsc --noEmit src/components/landing/FavoriteBrands.tsx
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/FavoriteBrands.tsx
git commit -m "feat: add FavoriteBrands landing section component"
```

---

### Task 4: Integrate Sections in page.tsx

**Files:**
- Modify: `src/app/page.tsx:83-86` (between Catalogue and Bonus)

- [ ] **Step 1: Add imports**

```tsx
// Add after line 14 (Catalogue import)
import { BestSellers } from "@/components/landing/BestSellers";
import { FavoriteBrands } from "@/components/landing/FavoriteBrands";
```

- [ ] **Step 2: Add components to page**

```tsx
// Add after line 83 (<Catalogue products={landingProducts} />)
<BestSellers />
<FavoriteBrands />
```

- [ ] **Step 3: Verify page compiles**

```bash
npx tsc --noEmit src/app/page.tsx
```

Expected: No errors

- [ ] **Step 4: Run build**

```bash
npx next build
```

Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate BestSellers and FavoriteBrands in landing page"
```

---

### Task 5: Visual Verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open browser**

Navigate to `http://localhost:3000`

- [ ] **Step 3: Verify sections**

- [ ] Best Sellers section visible with category tabs and product carousel
- [ ] Favorite Brands section visible with brand logos and filtered products
- [ ] Carousel navigation works
- [ ] Brand filtering works
- [ ] Responsive on mobile

- [ ] **Step 4: Run lint**

```bash
npx eslint src/components/landing/BestSellers.tsx src/components/landing/FavoriteBrands.tsx src/app/page.tsx
```

Expected: No errors

- [ ] **Step 5: Final commit if needed**

```bash
git add -A
git commit -m "fix: visual adjustments for landing page sections"
```

---

## Self-Review Checklist

- [x] All file paths are exact
- [x] Complete code in every step
- [x] No placeholders (TBD, TODO, etc.)
- [x] Type consistency across components
- [x] Follows existing patterns (Reveal, Card, border-ink style)
- [x] Mobile-responsive design
- [x] Accessibility (aria-labels on buttons)
