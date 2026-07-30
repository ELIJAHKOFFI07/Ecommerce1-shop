/// Palettes de couleurs prédéfinies — miroir de `ThemePresets` côté mobile
/// (lib/core/theme.dart). Seul l'accent (gold/gold-dark) varie ; les
/// surfaces et le texte restent cohérents pour ne pas casser le contraste.
export type ThemePresetId =
  | "gold"
  | "emerald"
  | "ocean"
  | "ruby"
  | "amethyst"
  | "sahel";

export const THEME_PRESETS: {
  id: ThemePresetId;
  label: string;
  primary: string;
  secondary: string;
}[] = [
  { id: "gold", label: "Or & Noir", primary: "#E6C15C", secondary: "#B8933A" },
  { id: "emerald", label: "Émeraude", primary: "#3DD68C", secondary: "#1F9D63" },
  { id: "ocean", label: "Océan", primary: "#4FB8E8", secondary: "#2A7FB0" },
  { id: "ruby", label: "Rubis", primary: "#E85C7B", secondary: "#B93A57" },
  { id: "amethyst", label: "Améthyste", primary: "#A378E8", secondary: "#6D4CB0" },
  { id: "sahel", label: "Terracotta", primary: "#E8823D", secondary: "#B35A22" },
];

export type ThemeMode = "dark" | "light";

const PRESET_KEY = "dreamteamshop_theme_preset";
const MODE_KEY = "dreamteamshop_theme_mode";

export function getStoredPreset(): ThemePresetId {
  if (typeof window === "undefined") return "gold";
  const stored = window.localStorage.getItem(PRESET_KEY) as ThemePresetId | null;
  return THEME_PRESETS.some((p) => p.id === stored) ? stored! : "gold";
}

export function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(MODE_KEY) === "light" ? "light" : "dark";
}

/// Applique la palette + le mode au document (attributs lus par globals.css)
/// et persiste le choix.
export function applyTheme(preset: ThemePresetId, mode: ThemeMode): void {
  document.documentElement.dataset.preset = preset;
  document.documentElement.dataset.theme = mode;
  window.localStorage.setItem(PRESET_KEY, preset);
  window.localStorage.setItem(MODE_KEY, mode);
}
