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
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Thème de couleur</p>
        <button
          onClick={toggleMode}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:border-accent"
        >
          {mode === "dark" ? (
            <Moon className="h-3.5 w-3.5" />
          ) : (
            <Sun className="h-3.5 w-3.5" />
          )}
          {mode === "dark" ? "Sombre" : "Clair"}
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">
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
                <span className="text-xs font-bold text-on-accent">✓</span>
              )}
            </span>
            <span className="text-[10px] text-muted">{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
