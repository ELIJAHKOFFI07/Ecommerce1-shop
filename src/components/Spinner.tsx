import { cx } from "./ui";

/// Indicateur circulaire. `role="status"` + libellé : les lecteurs d'écran
/// annoncent le chargement sans voler le focus.
export function Spinner({ className, label = "Chargement" }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-live="polite" className={cx("inline-flex items-center gap-2", className)}>
      <span className="spinner" aria-hidden />
      <span className="sr-only">{label}…</span>
    </span>
  );
}

/// Écran de chargement d'une route (loading.tsx) : centré, sobre.
export function PageLoading({ label = "Chargement" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-muted-foreground" role="status" aria-live="polite">
      <span className="spinner !h-10 !w-10 !border-[3px] text-primary" aria-hidden />
      <p className="text-sm font-semibold">{label}…</p>
    </div>
  );
}
