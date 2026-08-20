"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  THEME_PRESETS,
  applyTheme,
  getStoredMode,
  getStoredPreset,
  type ThemeMode,
  type ThemePresetId,
} from "@/lib/theme";

/// Sélecteur de thème réutilisé sur /play/account et /admin : palettes de
/// couleurs prédéfinies + bascule clair/sombre, persistés en localStorage.
export function ThemeSwitcher() {
  const [preset, setPreset] = useState<ThemePresetId>("gold");
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    // Lit les valeurs déjà appliquées par le script anti-flash du layout.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreset(getStoredPreset());
    setMode(getStoredMode());
  }, []);

  const choose = (next: ThemePresetId) => {
    setPreset(next);
    applyTheme(next, mode);
  };

  const toggleMode = () => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyTheme(preset, next);
  };

  return (
    <div className="card-hard rounded-2xl bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold text-foreground">Thème de couleur</p>
        <button
          onClick={toggleMode}
          className="card-hard-sm inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 font-display text-xs font-bold text-foreground transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-surface-2 hover:shadow-none"
        >
          {mode === "dark" ? (
            <Moon className="h-3.5 w-3.5" strokeWidth={2.5} />
          ) : (
            <Sun className="h-3.5 w-3.5" strokeWidth={2.5} />
          )}
          {mode === "dark" ? "Sombre" : "Clair"}
        </button>
      </div>
      <p className="mt-1 text-xs font-semibold text-foreground/60">
        Choisissez la palette qui habille toute l&apos;app.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        {THEME_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => choose(p.id)}
            className="flex flex-col items-center gap-1"
            aria-label={p.label}
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{
                background: `linear-gradient(135deg, ${p.primary}, ${p.secondary})`,
                border: preset === p.id ? "3px solid var(--foreground)" : "3px solid transparent",
              }}
            >
              {preset === p.id && (
                <span className="text-xs font-bold text-background">✓</span>
              )}
            </span>
            <span className="text-[10px] font-semibold text-foreground/60">{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
