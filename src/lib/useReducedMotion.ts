"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

/// Indique si le visiteur a demandé à réduire les animations.
///
/// `useSyncExternalStore` plutôt qu'un `useEffect` + `setState` : la valeur
/// est lue au bon moment du rendu, sans rendu en cascade, et la version
/// serveur renvoie `true` — au premier rendu on suppose donc « pas
/// d'animation », ce qui évite qu'un contenu démarre en mouvement avant que
/// la préférence ne soit connue.
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true,
  );
}
