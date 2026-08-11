/// Palettes de couleurs prédéfinies. Seul l'accent varie ; les surfaces et le
/// texte restent identiques, pour ne pas casser les contrastes vérifiés dans
/// globals.css.
///
/// Les valeurs ci-dessous ne servent qu'aux pastilles du sélecteur : les
/// couleurs réellement appliquées sont celles de globals.css, qui possèdent
/// une variante par thème.
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
  // `gold` est conservé comme identifiant : c'est la valeur déjà écrite dans
  // le stockage local des visiteurs. La renommer ferait repartir chacun sur
  // un thème qu'il n'a pas choisi.
  { id: "gold", label: "Bleu", primary: "#2563EB", secondary: "#1D4ED8" },
  { id: "emerald", label: "Émeraude", primary: "#047857", secondary: "#065F46" },
  { id: "ocean", label: "Océan", primary: "#0369A1", secondary: "#075985" },
  { id: "ruby", label: "Rubis", primary: "#BE123C", secondary: "#9F1239" },
  { id: "amethyst", label: "Améthyste", primary: "#7C3AED", secondary: "#6D28D9" },
  { id: "sahel", label: "Terracotta", primary: "#C2410C", secondary: "#9A3412" },
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
