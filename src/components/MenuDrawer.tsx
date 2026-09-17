"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cx } from "./ui";
import { SignOutButton } from "./SignOutButton";

export type MenuSection = { title?: string; items: { href: string; label: string; exact?: boolean }[] };

/// Bouton « Menu ☰ » qui ouvre un panneau avec TOUTES les options, groupées
/// par rubrique. Même mécanique pour un membre et pour l'administration :
/// on apprend une fois, on retrouve partout. Se ferme au changement de
/// page, à la touche Échap, ou en cliquant à côté.
export function MenuDrawer({ sections, userName, subtitle, signOut = true }: { sections: MenuSection[]; userName?: string; subtitle?: string; signOut?: boolean }) {
  const path = usePathname();
  // Le panneau est lié à la page : changer de page le ferme. On mémorise
  // la page d'ouverture plutôt que de fermer dans un effet (pas de
  // re-rendu en cascade).
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === path;
  const setOpen = (v: boolean) => setOpenedOn(v ? path : null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Le focus entre dans le panneau, et revient au bouton à la fermeture.
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
          <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <aside id="menu-panel" role="dialog" aria-label="Menu" className="absolute inset-y-0 right-0 flex w-[min(22rem,90vw)] flex-col bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
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
            <nav className="flex-1 overflow-y-auto px-3 py-3">
              {sections.map((s, i) => (
                <div key={i} className="mb-4">
                  {s.title && <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{s.title}</p>}
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
            {signOut && (
              <div className="border-t border-border px-3 py-3">
                <SignOutButton className="w-full text-left" />
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
