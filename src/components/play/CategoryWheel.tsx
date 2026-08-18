"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, LayoutGrid } from "lucide-react";
import { useReducedMotion } from "@/lib/useReducedMotion";

/// Roue de catégories verticale défilante (desktop).
///
/// La catégorie au centre de la fenêtre est la sélection courante : on
/// défile (molette, doigt ou flèches haut/bas) pour la changer. La fenêtre
/// montre toujours 3 items au-dessus et 3 en dessous du centre, et la liste
/// est bornée par ses extrémités — jamais de boucle infinie. Taper un item le
/// sélectionne immédiatement et la roue s'aligne dessus.
///
/// Le style et l'animation de l'arc sont conservés : pastilles `card-hard-sm`,
/// item du centre à l'encre, effet de profondeur (réduction, inclinaison,
/// fondu) appliqué en direct sur les refs pendant le défilement, cadencé par
/// `requestAnimationFrame` — aucun re-render React. La sélection est
/// confirmée après un court temps d'arrêt, pour ne pas rafraîchir les
/// résultats à chaque pixel parcouru. En `prefers-reduced-motion`, tout est
/// plat et instantané.

const PILL_H = 40;
const GAP = 10;
const SLOT = PILL_H + GAP;
const VISIBLE = 3;
const WINDOW_H = (2 * VISIBLE + 1) * SLOT;
const CENTER_PAD = WINDOW_H / 2 - PILL_H / 2;
const SETTLE_MS = 250; // temps d'arrêt avant de valider la sélection

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
  const idleRef = useRef<number | null>(null);
  const firstRunRef = useRef(true);
  const selectedIdRef = useRef(selectedId);
  const reduced = useReducedMotion();

  // Initialisé sur la sélection courante : au premier rendu, l'item déjà
  // choisi porte l'accent sans attendre que la géométrie soit calculée.
  const [focusIndex, setFocusIndex] = useState(() => {
    const idx = items.findIndex((item) => item.id === selectedId);
    return idx >= 0 ? idx : 0;
  });

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // Applique l'effet de profondeur à chaque item selon sa distance au centre
  // de la fenêtre. Lit les rectangles à la volée : aucun re-render pendant le
  // défilement.
  const layout = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const trackRect = track.getBoundingClientRect();
    const containerCenter = trackRect.top + track.clientHeight / 2;
    let nearest = -1;
    let minDist = Infinity;
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const d = (rect.top + rect.height / 2 - containerCenter) / SLOT;
      const abs = Math.abs(d);
      if (abs < minDist) {
        minDist = abs;
        nearest = i;
      }
      const visible = abs <= VISIBLE;
      el.style.transform = reduced
        ? "none"
        : `rotate(${d * -3}deg) scale(${Math.max(0.7, 1 - 0.07 * abs)})`;
      el.style.opacity = visible ? String(1 - 0.22 * abs) : "0";
      el.style.zIndex = String(40 - abs);
      el.style.pointerEvents = visible ? "auto" : "none";
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
      rafRef.current = requestAnimationFrame(() => {
        layout();
        // Sélection après un temps d'arrêt : tant que le défilement continue,
        // le minuteur est repoussé. Vérifie aussi que l'item central n'est pas
        // déjà la sélection courante pour éviter les requêtes inutiles.
        if (idleRef.current !== null) window.clearTimeout(idleRef.current);
        idleRef.current = window.setTimeout(() => {
          const n = focusRef.current;
          if (n >= 0 && items[n] && items[n].id !== selectedIdRef.current) {
            onSelect(items[n].id);
          }
        }, SETTLE_MS);
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (idleRef.current !== null) window.clearTimeout(idleRef.current);
    };
  }, [layout, items, onSelect]);

  const centerOn = useCallback(
    (idx: number, smooth: boolean) => {
      const track = trackRef.current;
      const el = itemRefs.current[idx];
      if (!track || !el) return;
      const top = Math.max(
        0,
        Math.min(
          el.offsetTop - (track.clientHeight - el.offsetHeight) / 2,
          track.scrollHeight - track.clientHeight,
        ),
      );
      track.scrollTo({ top, behavior: smooth && !reduced ? "smooth" : "auto" });
    },
    [reduced],
  );

  // Recentrage au chargement puis à chaque sélection : l'item choisi revient
  // au centre de la fenêtre. Le premier passage est instantané pour ne pas
  // faire défiler la roue sous les yeux au montage.
  useEffect(() => {
    if (items.length === 0) return;
    const idx = items.findIndex((item) => item.id === selectedId);
    centerOn(idx >= 0 ? idx : 0, !firstRunRef.current);
    firstRunRef.current = false;
    layout();
  }, [items, selectedId, centerOn, layout]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const cur = items.findIndex((item) => item.id === selectedId);
    const base = cur >= 0 ? cur : 0;
    const next = e.key === "ArrowUp" ? base - 1 : base + 1;
    if (next >= 0 && next < items.length) onSelect(items[next].id);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 border-border bg-accent text-on-accent">
            <LayoutGrid className="h-3 w-3" strokeWidth={2.5} />
          </span>
          Catégories
        </p>
        <p className="text-[11px] text-muted">Défilez pour changer</p>
      </div>

      <div className="relative">
        <div
          ref={trackRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          aria-label="Catégories : défilez pour changer de catégorie"
          className="scrollbar-hide relative overflow-y-auto rounded-2xl snap-y outline-none focus-visible:ring-2 focus-visible:ring-accent"
          style={{ height: WINDOW_H }}
        >
          <div
            className="flex flex-col items-center gap-2.5"
            style={{ paddingBlock: CENTER_PAD }}
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
                  onClick={() => onSelect(item.id)}
                  aria-pressed={selected}
                  className={`card-hard-sm h-10 max-w-full shrink-0 snap-center truncate whitespace-nowrap rounded-full px-5 text-sm font-medium transition-colors duration-200 ${
                    selected
                      ? "bg-foreground text-background"
                      : focused
                        ? "bg-accent text-on-accent"
                        : "bg-surface text-muted hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Curseur façon machine à sous : marque la ligne de sélection (le
            centre de la fenêtre), au-dessus des pastilles. */}
        <ChevronRight
          aria-hidden
          strokeWidth={3}
          className="pointer-events-none absolute left-0 top-1/2 z-30 h-4 w-4 -translate-y-1/2 text-accent"
        />
      </div>
    </div>
  );
}
