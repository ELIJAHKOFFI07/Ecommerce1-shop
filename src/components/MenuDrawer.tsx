"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cx } from "./ui";
import { SignOutButton } from "./SignOutButton";
import { ThemeToggle } from "./ThemeToggle";

export type MenuSection = { title?: string; items: { href: string; label: string; exact?: boolean }[] };

/// Bouton « Menu ☰ » qui ouvre un panneau À GAUCHE avec toutes les
/// options, groupées par rubrique. Le panneau fait exactement la hauteur
/// de l'écran (h-dvh) et sa liste défile à l'intérieur : aucune option ne
/// peut être coupée en bas, même sur un petit téléphone. Le pied (mode
/// sombre, déconnexion) reste toujours visible.
export function MenuDrawer({ sections, userName, subtitle, signOut = true }: { sections: MenuSection[]; userName?: string; subtitle?: string; signOut?: boolean }) {
  const path = usePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === path;
  const setOpen = (v: boolean) => setOpenedOn(v ? path : null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenedOn(null);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const trigger = triggerRef.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      trigger?.focus();
    };
  }, [open]);

  const isActive = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(href + "/"));

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="menu-panel" className="press inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-card px-4 text-sm font-semibold hover:bg-muted">
        <Menu className="h-5 w-5" aria-hidden /> Menu
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-black/45" onClick={() => setOpen(false)} />
          <aside id="menu-panel" role="dialog" aria-label="Menu" className="absolute left-0 top-0 flex h-dvh w-[min(21rem,88vw)] flex-col bg-background shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <div className="min-w-0">
                {userName ? (
                  <>
                    <p className="truncate font-semibold">{userName}</p>
                    {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
                  </>
                ) : (
                  <p className="font-semibold">Menu</p>
                )}
              </div>
              <button ref={closeRef} type="button" aria-label="Fermer" onClick={() => setOpen(false)} className="grid h-11 w-11 cursor-pointer place-items-center rounded-md hover:bg-muted">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
              {sections.map((s, i) => (
                <div key={i} className="mb-3">
                  {s.title && <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{s.title}</p>}
                  <ul>
                    {s.items.map((it) => (
                      <li key={it.href}>
                        <Link href={it.href} aria-current={isActive(it.href, it.exact) ? "page" : undefined} className={cx("block rounded-md px-3 py-3 text-[15px] font-semibold", isActive(it.href, it.exact) ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                          {it.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            <div className="shrink-0 border-t border-border px-3 py-2">
              <ThemeToggle />
              {signOut && <SignOutButton className="w-full text-left" />}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
