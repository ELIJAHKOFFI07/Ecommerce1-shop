"use client";

import { useState, type ReactNode } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { Alert, Button, cx } from "./ui";

/// Briques du back-office, côté client.

/// Bouton qui appelle l'API puis rafraîchit la page serveur. Le message
/// d'erreur s'affiche juste sous le bouton, jamais dans une fenêtre.
export function ActionButton({
  path,
  method = "POST",
  body,
  children,
  variant = "primary",
  size = "md",
  confirm,
  onDone,
  redirect,
  className,
  disabled,
}: {
  path: string;
  method?: "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  children: ReactNode;
  variant?: "primary" | "secondary" | "destructive" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
  confirm?: string;
  onDone?: () => void;
  redirect?: string;
  className?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    setError(null);
    try {
      await api(path, { method, json: body });
      onDone?.();
      if (redirect) router.push(redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cx("inline-flex flex-col gap-2", className)}>
      <Button variant={variant} size={size} onClick={run} disabled={busy || disabled}>
        {busy ? "…" : children}
      </Button>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}

/// Barre de recherche : met à jour `?q=` sans rechargement complet.
export function SearchBox({ placeholder = "Rechercher" }: { placeholder?: string }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const p = new URLSearchParams(params.toString());
        if (q.trim()) p.set("q", q.trim());
        else p.delete("q");
        p.delete("page");
        router.push(`${path}?${p.toString()}`);
      }}
      className="relative w-full max-w-md"
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-12 w-full rounded-md border border-border-strong bg-card pl-11 pr-4 focus:border-foreground focus:outline-none" />
    </form>
  );
}

/// Filtre par onglets (`?status=`).
export function FilterTabs({ param, options }: { param: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const current = params.get(param) ?? "";
  return (
    <div className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={current === o.value}
          onClick={() => {
            const p = new URLSearchParams(params.toString());
            if (o.value) p.set(param, o.value);
            else p.delete(param);
            p.delete("page");
            router.push(`${path}?${p.toString()}`);
          }}
          className={cx("shrink-0 cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold", current === o.value ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-card hover:bg-muted")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Pagination({ page, pages }: { page: number; pages: number }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  if (pages <= 1) return null;
  const go = (p: number) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("page", String(p));
    router.push(`${path}?${sp.toString()}`);
  };
  return (
    <div className="mt-6 flex items-center justify-between">
      <Button variant="secondary" size="sm" onClick={() => go(page - 1)} disabled={page <= 1}>
        Précédent
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} / {pages}
      </span>
      <Button variant="secondary" size="sm" onClick={() => go(page + 1)} disabled={page >= pages}>
        Suivant
      </Button>
    </div>
  );
}

/// Tableau simple : en-têtes, lignes, défilement horizontal si besoin.
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-[15px]">
        <thead>
          <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {head.map((h, i) => (
              <th key={i} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export const td = "px-4 py-3 align-middle";
