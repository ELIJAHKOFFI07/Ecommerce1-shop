"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useOptionalSession } from "@/lib/session";
import { ROLE_LABELS, roleOf } from "@/lib/roles";
import { SECTIONS, visibleLinks } from "@/lib/nav";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import type { LucideIcon } from "lucide-react";

/// Menu déroulant du bouton « Compte » de la barre du haut.
///
/// Reprend la même source unique que le tiroir latéral (`SECTIONS`) : ajouter
/// une entrée dans `lib/nav.ts` la fait apparaître ici, dans le tiroir et sur
/// la page compte. Le panneau porte le trait néo-brutal (`card-hard`) pour
/// rester cohérent avec le reste de l'interface.
///
/// `round` rend un bouton rond icône seule (grammaire du header principal,
/// à côté de « Vendre ») ; sans, un lien texte (nav desktop de PlayNav).
export function AccountDropdown({
  label,
  icon: Icon,
  round = false,
}: {
  label: string;
  icon: LucideIcon;
  round?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const session = useOptionalSession();
  const profile = session?.profile ?? null;
  const canSell = session?.canSell ?? false;
  const isAdmin = profile?.is_admin ?? false;

  const active = pathname.startsWith("/play/account");

  // Fermeture au clic extérieur (inclut la touche Échap) sans bloquer le
  // défilement de la page derrière — c'est un panneau, pas un tiroir.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {round ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={label}
          className={`card-hard-sm grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors ${
            open ? "bg-surface-2" : "bg-card hover:bg-surface-2"
          }`}
        >
          <Icon className="h-5 w-5" strokeWidth={2.4} />
        </button>
      ) : (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          className={`flex items-center gap-1.5 ${
            active || open ? "text-accent" : "text-muted hover:text-foreground"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      )}

      {open && (
        <div
          role="menu"
          className="card-hard absolute right-0 top-full z-50 mt-3 max-h-[70vh] w-72 max-w-[85vw] overflow-y-auto rounded-2xl bg-surface p-2"
        >
          {profile && (
            <div className="border-b border-border px-3 pb-3 pt-2">
              <p className="truncate font-semibold">
                {profile.full_name ?? profile.username}
              </p>
              <p className="text-xs text-accent">
                {ROLE_LABELS[roleOf(profile) ?? "user"]} ·{" "}
                {profile.loyalty_points} points
              </p>
            </div>
          )}

          <nav>
            {SECTIONS.map((section) => {
              const links = visibleLinks(section.links, { canSell, isAdmin });
              if (links.length === 0) return null;
              return (
                <div key={section.title} className="mb-1">
                  <p className="mb-1 px-3 pt-3 text-xs uppercase tracking-wide text-muted">
                    {section.title}
                  </p>
                  <ul className="space-y-0.5">
                    {links.map(({ href, label: linkLabel, icon: LinkIcon }) => {
                      const itemActive = pathname === href;
                      return (
                        <li key={`${section.title}-${href}`}>
                          <Link
                            href={href}
                            role="menuitem"
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                              itemActive
                                ? "bg-accent/10 text-accent"
                                : "text-foreground hover:bg-surface-2"
                            }`}
                          >
                            <LinkIcon className="h-4 w-4 shrink-0 text-accent" />
                            {linkLabel}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>

          {/* Bascule de thème clair/sombre, dans le gabarit compact du menu. */}
          <div className="mt-1 border-t border-border pb-1 pt-2">
            <p className="mb-1 px-3 text-xs uppercase tracking-wide text-muted">
              Apparence
            </p>
            <ThemeSwitcher compact />
          </div>
        </div>
      )}
    </div>
  );
}