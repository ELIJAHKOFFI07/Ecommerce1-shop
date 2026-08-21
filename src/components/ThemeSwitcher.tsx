"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { applyTheme, getStoredMode, type ThemeMode } from "@/lib/theme";

/// Sélecteur de thème : bascule clair/sombre persistée en localStorage.
///
/// Rendu en carte (`compact={false}`, par défaut) sur /play/account et /admin,
/// ou en rangée de menu (`compact`) dans le menu déroulant du header — la
/// logique reste unique, seul le gabarit change.
export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    // Lit la valeur déjà appliquée par le script anti-flash du layout.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(getStoredMode());
  }, []);

  const toggleMode = () => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyTheme(next);
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleMode}
        role="menuitem"
        aria-label={`Passer en mode ${mode === "dark" ? "clair" : "sombre"}`}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-2"
      >
        {mode === "dark" ? (
          <Moon className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
        ) : (
          <Sun className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
        )}
        <span className="flex-1 text-left">Mode {mode === "dark" ? "sombre" : "clair"}</span>
        <span className="rounded-sm bg-card px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wide text-foreground">
          {mode === "dark" ? "Sombre" : "Clair"}
        </span>
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-sm bg-card p-4">
      <div>
        <p className="font-display text-sm font-bold text-foreground">Thème</p>
        <p className="mt-1 text-xs font-semibold text-foreground/60">
          Mode sombre ou clair, appliqué à toute l&apos;app.
        </p>
      </div>
      <button
        type="button"
        onClick={toggleMode}
        className="inline-flex items-center gap-1.5 rounded-sm bg-card px-3 py-1.5 font-display text-xs font-bold text-foreground transition-all hover:bg-surface-2"
      >
        {mode === "dark" ? (
          <Moon className="h-3.5 w-3.5" strokeWidth={2.5} />
        ) : (
          <Sun className="h-3.5 w-3.5" strokeWidth={2.5} />
        )}
        {mode === "dark" ? "Sombre" : "Clair"}
      </button>
    </div>
  );
}