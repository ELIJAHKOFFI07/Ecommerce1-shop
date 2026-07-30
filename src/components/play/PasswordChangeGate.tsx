"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/session";

const TARGET = "/play/account/password?obligatoire=1";

/// Redirige vers le changement de mot de passe tant que l'administrateur
/// l'exige (profiles.must_change_password, migration 008).
///
/// Le contrôle est ici volontairement côté interface : il n'y a rien à
/// protéger de plus que le confort d'usage, puisque les données restent
/// gardées par les RLS quel que soit l'écran affiché.
export function PasswordChangeGate() {
  const { profile } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!profile?.must_change_password) return;
    if (pathname.startsWith("/play/account/password")) return;
    router.replace(TARGET);
  }, [profile?.must_change_password, pathname, router]);

  return null;
}
