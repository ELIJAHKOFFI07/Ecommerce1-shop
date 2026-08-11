"use client";

import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { createClient } from "@/lib/backend/client";

const DISMISS_KEY = "dreamteamshop_announcement_dismissed";

/// Message à la une publié par un administrateur (Réglages du back-office).
/// Visible par tous les comptes connectés ou non, sur /play.
export function AnnouncementBanner() {
  const [message, setMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await createClient()
        .from("platform_settings")
        .select("announcement, announcement_active")
        .maybeSingle();
      if (cancelled) return;
      const row = data as
        | { announcement: string | null; announcement_active: boolean }
        | null;
      if (!row?.announcement_active || !row.announcement) return;
      setMessage(row.announcement);
      // Le message masqué le reste tant qu'il n'a pas changé.
      setDismissed(
        window.localStorage.getItem(DISMISS_KEY) === row.announcement,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!message || dismissed) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4">
      <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
      <p className="min-w-0 flex-1 whitespace-pre-line text-sm">{message}</p>
      <button
        onClick={() => {
          window.localStorage.setItem(DISMISS_KEY, message);
          setDismissed(true);
        }}
        className="shrink-0 text-muted hover:text-foreground"
        aria-label="Masquer le message"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
