import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { formatFcfa, type DecimalLike } from "@/lib/money";

/// Primitives d'interface. Un seul fichier, volontairement : le système
/// est petit et cohérent, on veut le voir d'un coup d'œil.
///
/// Règle : un bouton `primary` par écran. Les secondaires sont bordés,
/// les tertiaires sont du texte. Le destructif est rouge et jamais côte à
/// côte avec le primaire.

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// ── Boutons ──
const BTN_BASE =
  "press inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer";
const BTN_SIZE = { md: "h-12 px-5 text-[15px]", lg: "h-14 px-7 text-base", sm: "h-10 px-4 text-sm" };
const BTN_VARIANT = {
  primary: "bg-primary text-primary-foreground hover:bg-secondary",
  accent: "bg-accent text-accent-foreground hover:brightness-95",
  secondary: "border border-border-strong bg-card text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
  destructive: "bg-destructive text-destructive-foreground hover:brightness-95",
};
type BtnProps = { variant?: keyof typeof BTN_VARIANT; size?: keyof typeof BTN_SIZE; full?: boolean; loading?: boolean };

/// `loading` : cercle qui tourne à la place de l'icône, bouton désactivé,
/// libellé conservé (le membre voit ce qui est en cours).
export function Button({ variant = "primary", size = "md", full, loading, className, children, disabled, ...rest }: ComponentProps<"button"> & BtnProps) {
  return (
    <button type="button" aria-busy={loading || undefined} disabled={disabled || loading} className={cx(BTN_BASE, BTN_SIZE[size], BTN_VARIANT[variant], full && "w-full", className)} {...rest}>
      {loading && <span className="spinner" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant = "primary", size = "md", full, className, ...rest }: ComponentProps<typeof Link> & BtnProps) {
  return <Link className={cx(BTN_BASE, BTN_SIZE[size], BTN_VARIANT[variant], full && "w-full", className)} {...rest} />;
}

// ── Champs ──
export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string | null; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-foreground">
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const INPUT =
  "block w-full h-12 rounded-md border border-border-strong bg-card px-4 text-base text-foreground placeholder:text-muted-foreground/70 focus:border-foreground focus:outline-none focus:ring-2 focus:ring-ring/15 disabled:bg-muted";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cx(INPUT, className)} {...rest} />;
}
export function Select({ className, ...rest }: ComponentProps<"select">) {
  return <select className={cx(INPUT, "pr-10", className)} {...rest} />;
}
export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cx(INPUT, "h-auto min-h-28 py-3", className)} {...rest} />;
}

// ── Surfaces ──
export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cx("rounded-lg border border-border bg-card", className)} {...rest} />;
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl font-semibold leading-none tracking-tight lg:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Montants & statuts ──
export function Money({ value, className }: { value: DecimalLike | null | undefined; className?: string }) {
  return <span className={cx("font-display tabular font-semibold", className)}>{formatFcfa(value)}</span>;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "En attente", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  VALIDATED: { label: "Validée", cls: "bg-green-50 text-green-800 border-green-200" },
  APPROVED: { label: "Approuvé", cls: "bg-green-50 text-green-800 border-green-200" },
  DELIVERED: { label: "Remis", cls: "bg-stone-100 text-stone-700 border-stone-200" },
  RECEIVED: { label: "Reçue", cls: "bg-green-50 text-green-800 border-green-200" },
  CANCELLED: { label: "Annulée", cls: "bg-stone-100 text-stone-700 border-stone-200" },
  REFUNDED: { label: "Remboursée", cls: "bg-stone-100 text-stone-700 border-stone-200" },
  REJECTED: { label: "Rejetée", cls: "bg-red-50 text-red-800 border-red-200" },
  UPCOMING: { label: "À venir", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  IN_PROGRESS: { label: "En cours", cls: "bg-green-50 text-green-800 border-green-200" },
  PAST: { label: "Passée", cls: "bg-stone-100 text-stone-700 border-stone-200" },
  CREDIT: { label: "Crédit", cls: "bg-green-50 text-green-800 border-green-200" },
  DEBIT: { label: "Débit", cls: "bg-red-50 text-red-800 border-red-200" },
  TRANSFER: { label: "Transfert", cls: "bg-stone-100 text-stone-700 border-stone-200" },
  REFUND: { label: "Remboursement", cls: "bg-green-50 text-green-800 border-green-200" },
};

export function StatusPill({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-muted text-foreground border-border" };
  return <span className={cx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", s.cls)}>{s.label}</span>;
}

// ── États ──
export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border-strong px-6 py-14 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {hint && <p className="mt-1 text-muted-foreground">{hint}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("shimmer rounded-md", className)} />;
}

export function Alert({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  const cls = { info: "bg-muted text-foreground", error: "bg-red-50 text-red-900 border border-red-200", success: "bg-green-50 text-green-900 border border-green-200" }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-md px-4 py-3 text-sm", cls)}>
      {children}
    </div>
  );
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function fmtDate(d: string | Date, withTime = false) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", ...(withTime ? { timeStyle: "short" } : {}) }).format(new Date(d));
}

export const DAYS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
