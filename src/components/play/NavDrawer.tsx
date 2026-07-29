"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { useSession } from "@/lib/session";
import { ROLE_LABELS, roleOf } from "@/lib/roles";
import { SECTIONS, visibleLinks } from "@/lib/nav";

/// Menu latéral regroupant toutes les fonctionnalités de l'espace personnel.
/// Disponible à toutes les tailles d'écran : sur téléphone, la barre du bas
/// ne peut afficher que 5 entrées, le reste n'était atteignable que par la
/// page compte.
export function NavDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { profile, canSell } = useSession();
  const isAdmin = profile?.is_admin ?? false;

  // Fermeture à la touche Échap + blocage du défilement de la page derrière.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  async function signOut() {
    await createClient().auth.signOut();
    onClose();
    window.location.href = "/play/login";
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
        aria-label="Fermer le menu"
      />

      <aside className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col overflow-y-auto border-r border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="min-w-0">
            {profile ? (
              <>
                <p className="truncate font-semibold">
                  {profile.full_name ?? profile.username}
                </p>
                <p className="text-xs text-gold">
                  {ROLE_LABELS[roleOf(profile) ?? "user"]} ·{" "}
                  {profile.loyalty_points} points
                </p>
              </>
            ) : (
              <p className="font-semibold">Menu</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1 text-muted hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!profile && (
          <div className="border-b border-border p-4">
            <Link
              href="/play/login"
              onClick={onClose}
              className="block rounded-full bg-gold py-2.5 text-center text-sm font-semibold text-black"
            >
              Se connecter
            </Link>
          </div>
        )}

        <nav className="flex-1 p-4">
          {SECTIONS.map((section) => {
            const links = visibleLinks(section.links, { canSell, isAdmin });
            if (links.length === 0) return null;
            return (
              <div key={section.title} className="mb-5">
                <p className="mb-2 text-xs uppercase tracking-wide text-muted">
                  {section.title}
                </p>
                <ul className="space-y-1">
                  {links.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href;
                    return (
                      <li key={`${section.title}-${href}`}>
                        <Link
                          href={href}
                          onClick={onClose}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                            active
                              ? "bg-gold/10 text-gold"
                              : "hover:bg-surface-2"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-gold" />
                          {label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {profile && (
          <div className="border-t border-border p-4">
            <button
              onClick={signOut}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border py-2.5 text-sm font-semibold hover:border-red-500 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" /> Se déconnecter
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
