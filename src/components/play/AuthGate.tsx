"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isMemberOnly } from "@/lib/nav";

/// Renvoie un visiteur vers la connexion lorsqu'il ouvre une page réservée
/// aux membres, en mémorisant sa destination.
///
/// `connected` vient du composant serveur parent : le déduire ici ferait
/// clignoter la page le temps de charger la session.
///
/// Confort de navigation uniquement — les données restent protégées par les
/// politiques RLS quelle que soit la page affichée.
export function AuthGate({ connected }: { connected: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (connected || !isMemberOnly(pathname)) return;
    router.replace(`/play/login?next=${encodeURIComponent(pathname)}`);
  }, [connected, pathname, router]);

  return null;
}
