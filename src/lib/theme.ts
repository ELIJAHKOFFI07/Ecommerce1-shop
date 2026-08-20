/// Mode clair/sombre. Le theming repose sur deux modes uniquement : l'accent,
/// les surfaces et le texte varient ensemble selon `data-theme` sur <html>,
/// lu par globals.css. Il n'y a plus de dimension « palette » : l'accent est
/// unique par mode.
export type ThemeMode = "dark" | "light";

const MODE_KEY = "dreamteamshop_theme_mode";

export function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  return window.localStorage.getItem(MODE_KEY) === "dark" ? "dark" : "light";
}

/// Applique le mode au document (attribut lu par globals.css) et persiste le
/// choix.
export function applyTheme(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode;
  window.localStorage.setItem(MODE_KEY, mode);
}