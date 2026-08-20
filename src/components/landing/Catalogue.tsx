"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Reveal } from "./Reveal";
import { HeartButton } from "./HeartButton";
import { Marker } from "./Marker";
import type {
  BadgeTone,
  LandingProduct,
  TagTone,
} from "./landingProducts";
import { SAMPLE_PRODUCTS } from "./landingProducts";

/* ------------------------------------------------------------------ */
/* Petits compteurs                                                    */
/* ------------------------------------------------------------------ */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/// Temps restant jusqu'à minuit (vente flash).
function FlashTimer() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const s = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
      setTime(`${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="ml-1 tabular-nums">{time}</span>;
}

/// Compte à rebours d'une enchère (même durée initiale que la démo).
function AuctionTimerSmall() {
  const endRef = useRef(0);
  const [time, setTime] = useState("");
  useEffect(() => {
    endRef.current = Date.now() + (2 * 3600 + 14 * 60 + 37) * 1000;
    const tick = () => {
      const s = Math.max(0, Math.floor((endRef.current - Date.now()) / 1000));
      setTime(`${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="ml-1 tabular-nums">{time}</span>;
}

/* ------------------------------------------------------------------ */
/* Carte produit                                                       */
/* ------------------------------------------------------------------ */

const BADGE_TONES: Record<BadgeTone, string> = {
  orange: "bg-primary text-primary-foreground border-border",
  ink: "bg-foreground text-sun border-sun",
  vert: "bg-secondary text-secondary-foreground border-border",
  sun: "bg-sun text-foreground border-border",
};

const TAG_TONES: Record<TagTone, string> = {
  neg: "bg-vert-soft text-vert-deep",
  flash: "bg-surface-2 text-accent-dark",
  auction: "bg-sun text-foreground",
};

function ProductCard({
  product,
  delay = 0,
}: {
  product: LandingProduct;
  delay?: number;
}) {
  return (
    <Reveal
      delay={delay}
      className="card-hover card-hard-sm group overflow-hidden rounded-3xl bg-card"
    >
      <div className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.alt}
          className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {product.badge && (
          <span
            className={`absolute left-3 top-3 rounded-full border-2 px-2.5 py-1 font-display text-xs font-extrabold ${BADGE_TONES[product.badge.tone]}`}
          >
            {product.badge.label}
          </span>
        )}
        <HeartButton className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border-2 border-border bg-card" />
      </div>

      <div className="p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-foreground/50">
          <MapPin className="h-3.5 w-3.5" strokeWidth={2.2} />
          {product.city}
        </div>
        <h3 className="font-display font-bold leading-snug">{product.title}</h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-lg font-extrabold text-accent-dark">
            {product.price}
          </span>
          {product.oldPrice && (
            <span className="text-sm font-semibold text-foreground/40 line-through">
              {product.oldPrice}
            </span>
          )}
        </div>
        {product.tag && (
          <p
            className={`mt-2 inline-flex rounded-md px-2 py-1 text-xs font-bold tabular-nums ${TAG_TONES[product.tag.tone]}`}
          >
            {product.tag.label}
            {product.tag.tone === "flash" && <FlashTimer />}
            {product.tag.tone === "auction" && <AuctionTimerSmall />}
          </p>
        )}
      </div>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* Section catalogue                                                   */
/* ------------------------------------------------------------------ */

export function Catalogue({
  products = SAMPLE_PRODUCTS,
}: {
  products?: LandingProduct[];
}) {
  return (
    <section id="catalogue" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-secondary">
            Fraîchement arrivés
          </p>
          <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Ce qui cartonne
            <br />
            en ce <Marker variant="vert">moment</Marker>
          </h2>
        </div>
        <a
          href="/play/search"
          className="underline-grow inline-flex items-center gap-2 font-display text-lg font-bold transition-colors hover:text-primary"
        >
          Tout explorer
          <span aria-hidden>→</span>
        </a>
      </Reveal>

      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
        {products.map((product, i) => (
          <ProductCard key={product.title} product={product} delay={i * 0.06} />
        ))}
      </div>
    </section>
  );
}
