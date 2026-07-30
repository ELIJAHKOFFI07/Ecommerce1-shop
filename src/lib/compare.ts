/// Comparateur : ids persistés en localStorage (3 max), pas de backend.
const KEY = "dreamteamshop_compare";
export const COMPARE_MAX = 3;

export function getCompareIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/// Retourne la nouvelle liste, ou null si le plateau est plein.
export function toggleCompareId(id: string): string[] | null {
  const ids = getCompareIds();
  let next: string[];
  if (ids.includes(id)) {
    next = ids.filter((x) => x !== id);
  } else {
    if (ids.length >= COMPARE_MAX) return null;
    next = [...ids, id];
  }
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearCompare(): void {
  window.localStorage.removeItem(KEY);
}
