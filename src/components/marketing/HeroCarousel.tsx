"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { formatFcfa, type Product } from "@/lib/types";
import { useReducedMotion } from "@/lib/useReducedMotion";

const INTERVAL = 5000;

/// Carrousel de mise en avant, en tête de la page d'accueil.
///
/// Défilement automatique, avec les garde-fous d'usage : mise en pause au
/// survol et au focus clavier, bouton d'arrêt explicite, et aucun démarrage
/// automatique si le visiteur a demandé à réduire les animations — un
/// contenu qui bouge tout seul est un obstacle pour beaucoup de gens.
export function HeroCarousel({ products }: { products: Product[] }) {
  const slides = products.slice(0, 5);
  const [index, setIndex] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();

  // Aucun démarrage automatique si le visiteur a demandé à réduire les
  // animations : la préférence l'emporte sur le bouton, qui reste
  // disponible pour relancer manuellement.
  const playing = !stopped && !reducedMotion;

  const go = useCallback(
    (next: number) => {
      if (slides.length === 0) return;
      setIndex(((next % slides.length) + slides.length) % slides.length);
    },
    [slides.length],
  );

  useEffect(() => {
    if (!playing || paused || slides.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, INTERVAL);
    return () => clearInterval(id);
  }, [playing, paused, slides.length]);

  if (slides.length === 0) return null;

  const active = slides[index];
  const cover = active.product_images?.[0]?.url;

  return (
    <div
      className="group relative overflow-hidden rounded-3xl bg-surface-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const delta = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(delta) > 50) go(index + (delta < 0 ? 1 : -1));
        touchX.current = null;
      }}
      aria-roledescription="carrousel"
      aria-label="Produits mis en avant"
    >
      <div className="grid items-center gap-6 p-6 sm:p-8 md:grid-cols-2 md:gap-10">
        {/* Texte — remplacé à chaque diapositive, d'où la clé sur l'index
            qui relance l'animation d'entrée. */}
        <div key={index} className="animate-rise order-2 md:order-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted">
            ✦ Sélection du moment
          </span>
          <h2 className="mt-4 line-clamp-2 text-2xl font-medium leading-tight tracking-tight sm:text-3xl lg:text-4xl">
            {active.title}
          </h2>
          {active.shops?.name && (
            <p className="mt-2 text-sm text-muted">
              Vendu par{" "}
              <span className="text-foreground">{active.shops.name}</span>
            </p>
          )}
          <p className="mt-4 text-3xl font-medium text-foreground">
            {formatFcfa(active.price)}
          </p>
          <Link
            href={`/play/product/${active.id}`}
            className="press mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-8 font-medium text-background transition-colors hover:bg-foreground/90"
          >
            Voir le produit
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Visuel */}
        <div className="order-1 md:order-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-background">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={active.id}
                src={cover}
                alt={active.title}
                className="animate-fade h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted">
                Pas d&apos;image
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contrôles */}
      <div className="flex items-center gap-3 px-6 pb-6 sm:px-8">
        <button
          onClick={() => go(index - 1)}
          className="press rounded-full border border-border p-2 transition-colors hover:bg-background"
          aria-label="Produit précédent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => go(index + 1)}
          className="press rounded-full border border-border p-2 transition-colors hover:bg-background"
          aria-label="Produit suivant"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Puces : largeur variable pour marquer la position sans dépendre
            de la seule couleur. */}
        <div className="flex flex-1 items-center justify-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => go(i)}
              aria-label={`Aller au produit ${i + 1} sur ${slides.length}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-7 bg-foreground" : "w-2.5 bg-border hover:bg-muted"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setStopped((s) => !s)}
          className="press rounded-full border border-border p-2 transition-colors hover:bg-background"
          aria-label={
            playing ? "Arrêter le défilement" : "Relancer le défilement"
          }
        >
          {playing ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
