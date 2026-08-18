"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { useReducedMotion } from "@/lib/useReducedMotion";

/// Roue de catégories en arc doux.
///
/// Les catégories sont posées comme des billes sur un fil légèrement courbé
/// (jamais un cercle complet) : l'élément le plus proche du centre du
/// conteneur est le plus haut, le plus grand et le plus droit — il porte
/// l'accent. Taper un élément le sélectionne et le recentre.
///
/// La géométrie de l'arc (montée, inclinaison, échelle, fondu) est appliquée
/// directement sur les refs depuis le handler de scroll, cadencé par
/// `requestAnimationFrame` : aucun re-render React pendant le défilement.
/// En `prefers-reduced-motion`, la courbe est neutralisée — tout reste plat
/// et le recentrage est instantané.

const ARC_RISE = 26;      // hauteur de l'arc au centre (px)
const RISE_PER_PX = 0.22; // redescente par pixel d'écart au centre
const TILT_MAX = 7;       // inclinaison maximale aux bords (deg)
const TILT_PER_PX = 0.06;
const SCALE_MIN = 0.85;
const SCALE_PER_PX = 0.004;
const FADE_START = 120;   // pleine opacité jusqu'à cet écart
const FADE_END = 320;     // puis fondu progressif vers les bords

export type CategoryWheelItem = { id: string | null; name: string };

export function CategoryWheel({
  items,
  selectedId,
  onSelect,
}: {
  items: CategoryWheelItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusRef = useRef(-1);
  const rafRef = useRef<number | null>(null);
  const firstRunRef = useRef(true);
  const reduced = useReducedMotion();
  // Initialisé sur la sélection courante : au premier rendu, l'item déjà
  // choisi porte l'accent sans attendre que la géométrie soit calculée.
  const [focusIndex, setFocusIndex] = useState(() => {
    const idx = items.findIndex((item) => item.id === selectedId);
    return idx >= 0 ? idx : 0;
  });

  // Applique la géométrie de l'arc à chaque item selon sa distance au centre
  // du conteneur. Lit les rectangles à la volée : aucune dépendance aux états
  // React, donc aucun re-render pendant le défilement.
  const layout = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    if (reduced) {
      itemRefs.current.forEach((el) => {
        if (el) {
          el.style.transform = "none";
          el.style.opacity = "1";
        }
      });
      return;
    }
    const containerCenter = track.scrollLeft + track.clientWidth / 2;
    const trackLeft = track.getBoundingClientRect().left;
    let nearest = -1;
    let minDist = Infinity;
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const center =
        rect.left - trackLeft + track.scrollLeft + rect.width / 2;
      const dist = center - containerCenter;
      const abs = Math.abs(dist);
      if (abs < minDist) {
        minDist = abs;
        nearest = i;
      }
      const rise = -ARC_RISE + Math.min(ARC_RISE, abs * RISE_PER_PX);
      const tilt = Math.max(-TILT_MAX, Math.min(TILT_MAX, -dist * TILT_PER_PX));
      const scale = Math.max(SCALE_MIN, 1 - abs * SCALE_PER_PX);
      const opacity =
        abs <= FADE_START
          ? 1
          : Math.max(0, 1 - (abs - FADE_START) / (FADE_END - FADE_START));
      el.style.transform = `translateY(${rise}px) rotate(${tilt}deg) scale(${scale})`;
      el.style.opacity = String(opacity);
      el.style.zIndex = String(Math.max(1, 40 - Math.round(abs / 10)));
    });
    if (nearest !== focusRef.current) {
      focusRef.current = nearest;
      setFocusIndex(nearest);
    }
  }, [reduced]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(layout);
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    layout();
    return () => {
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [layout]);

  const centerOn = useCallback(
    (el: HTMLElement, smooth: boolean) => {
      const track = trackRef.current;
      if (!track) return;
      const left = el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2;
      track.scrollTo({
        left,
        behavior: smooth && !reduced ? "smooth" : "auto",
      });
    },
    [reduced],
  );

  // Au chargement puis à chaque sélection : l'item choisi revient au centre de
  // la roue. Le premier passage est instantané pour ne pas dérouler l'arc sous
  // les yeux au montage.
  useEffect(() => {
    if (items.length === 0) return;
    const idx = items.findIndex((item) => item.id === selectedId);
    const el = itemRefs.current[idx >= 0 ? idx : 0];
    if (el) centerOn(el, !firstRunRef.current);
    firstRunRef.current = false;
    layout();
  }, [items, selectedId, centerOn, layout]);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 border-border bg-accent text-on-accent">
            <LayoutGrid className="h-3 w-3" strokeWidth={2.5} />
          </span>
          Catégories
        </p>
        <p className="hidden text-[11px] text-muted sm:block">
          Faites défiler pour explorer
        </p>
      </div>

      <div className="relative">
        {/* Halo d'accent derrière le centre : marque la position du curseur de
            la roue, sans dépendre de la position de défilement. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-12 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-xl"
        />

        <div
          ref={trackRef}
          className="scrollbar-hide relative z-10 flex h-28 items-center gap-2 overflow-x-auto px-[max(1rem,calc(50%_-_6rem))] py-2 snap-x [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
        >
          {items.map((item, i) => {
            const selected = item.id === selectedId;
            const focused = i === focusIndex;
            return (
              <button
                key={item.id ?? "__all__"}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                onClick={(e) => {
                  onSelect(item.id);
                  centerOn(e.currentTarget, true);
                }}
                aria-pressed={selected}
                className={`card-hard-sm shrink-0 snap-center whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition-colors duration-200 ${
                  selected
                    ? "bg-foreground text-background"
                    : focused
                      ? "bg-accent text-on-accent"
                      : "bg-surface text-muted hover:text-foreground"
                }`}
              >
                {item.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
