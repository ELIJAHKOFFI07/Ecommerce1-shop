"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/// Carrousel horizontal à ancrage (scroll-snap).
///
/// Le défilement natif est conservé : molette, glissement tactile et
/// navigation clavier fonctionnent sans code supplémentaire. Les flèches ne
/// sont qu'un raccourci, et disparaissent quand il n'y a rien à faire
/// défiler — un bouton inerte est pire que pas de bouton.
export function ScrollCarousel({
  children,
  itemClassName = "w-44 sm:w-52",
}: {
  children: React.ReactNode;
  itemClassName?: string;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [scrollable, setScrollable] = useState(false);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setScrollable(max > 4);
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft >= max - 4);
  }, []);

  useEffect(() => {
    sync();
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sync]);

  function nudge(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={sync}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {Array.isArray(children)
          ? children.map((child, i) => (
              <div key={i} className={`shrink-0 snap-start ${itemClassName}`}>
                {child}
              </div>
            ))
          : children}
      </div>

      {scrollable && (
        <>
          <Arrow
            side="left"
            hidden={atStart}
            onClick={() => nudge(-1)}
            label="Faire défiler vers la gauche"
          />
          <Arrow
            side="right"
            hidden={atEnd}
            onClick={() => nudge(1)}
            label="Faire défiler vers la droite"
          />
        </>
      )}
    </div>
  );
}

function Arrow({
  side,
  hidden,
  onClick,
  label,
}: {
  side: "left" | "right";
  hidden: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      // `pointer-events-none` en plus de l'opacité : un bouton invisible
      // resterait cliquable et volerait le clic sur la carte du dessous.
      className={`press absolute top-1/2 hidden -translate-y-1/2 rounded-full border border-border bg-background/90 p-2 shadow-lg backdrop-blur transition-opacity hover:border-accent hover:text-accent sm:block ${
        side === "left" ? "-left-3" : "-right-3"
      } ${hidden ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      {side === "left" ? (
        <ChevronLeft className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
    </button>
  );
}
