"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "dreamshop.theme";
type Theme = "light" | "dark";

/// Bascule clair / sombre. Le choix est appliqué sur <html data-theme> et
/// mémorisé ; un script inline dans layout.tsx le relit AVANT le premier
/// rendu pour éviter l'éclair blanc au chargement.
/// Source de vérité : l'attribut data-theme du document, observé via
/// useSyncExternalStore (pas de setState dans un effet, pas de décalage
/// d'hydratation : le serveur rend « light »).
const listeners = new Set<() => void>();
const read = (): Theme => (typeof document !== "undefined" && document.documentElement.dataset.theme === "dark" ? "dark" : "light");
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => "light" as Theme);
  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignoré */
    }
    listeners.forEach((cb) => cb());
  }
  return (
    <button type="button" onClick={toggle} aria-pressed={theme === "dark"} className="flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-3 text-[15px] font-semibold hover:bg-muted">
      <span className="inline-flex items-center gap-3">
        {theme === "dark" ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
        {theme === "dark" ? "Mode clair" : "Mode sombre"}
      </span>
      <span aria-hidden className={`relative h-6 w-11 rounded-full transition-colors ${theme === "dark" ? "bg-accent" : "bg-border-strong"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${theme === "dark" ? "translate-x-5" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}
