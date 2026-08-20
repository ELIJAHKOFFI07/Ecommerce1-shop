"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReducedMotion } from "@/lib/useReducedMotion";

/// Carousel des sections vitrines : les cards produits défilent
/// horizontalement, pilotées par deux boutons placés sous la rangée et par
/// un défilement automatique toutes les `AUTO_SCROLL_MS` (mis en pause au
/// survol / focus pour laisser l'utilisateur lire à son rythme).
///
/// Le défilement automatique est désactivé si le visiteur préfère réduire
/// les animations (`prefers-reduced-motion`) : un contenu qui bouge sans
/// demande explicite est une source de distraction à éviter.
const SCROLL_AMOUNT = 300;
const AUTO_SCROLL_MS = 3000;

export function ShowcaseCarousel({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -SCROLL_AMOUNT : SCROLL_AMOUNT,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (reducedMotion || paused) return;
    const id = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 5;
      if (atEnd) {
        // Retour en début de rangée pour une boucle fluide.
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: SCROLL_AMOUNT, behavior: "smooth" });
      }
    }, AUTO_SCROLL_MS);
    return () => clearInterval(id);
  }, [reducedMotion, paused]);

  return (
    <div
      className="flex flex-col"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
      >
        {children}
      </div>

      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => scroll("left")}
          className="grid h-9 w-9 place-items-center rounded-full border border-border/20 bg-white text-foreground/40 transition-colors hover:bg-foreground hover:text-background"
          aria-label="Précédent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => scroll("right")}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-foreground text-background transition-colors hover:bg-primary hover:text-primary-foreground"
          aria-label="Suivant"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}