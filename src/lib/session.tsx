"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/backend/client";
import { roleOf, type UserRole } from "./roles";
import type { Profile } from "./types";

export { roleOf, ROLE_LABELS, type UserRole } from "./roles";

type SessionContextValue = {
  profile: Profile | null;
  role: UserRole | null;
  /// true tant que le profil n'a pas été chargé : évite d'afficher
  /// brièvement l'interface d'un rôle avant de connaître le vrai.
  loading: boolean;
  /// Un vendeur peut vendre ; un admin aussi (il gère la plateforme).
  canSell: boolean;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .maybeSingle();
    setProfile((data as Profile | null) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();

    // Sans cet abonnement, le profil n'était chargé qu'au montage du layout.
    // Or la connexion redirige côté client sans remonter le layout : le
    // profil restait null après un login, donc « Vendre » et le lien
    // back-office n'apparaissaient qu'après un rechargement complet.
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  const value = useMemo<SessionContextValue>(() => {
    const role = roleOf(profile);
    return {
      profile,
      role,
      loading,
      canSell: role === "seller" || role === "admin",
      refresh,
    };
  }, [profile, loading, refresh]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession doit être utilisé dans un SessionProvider");
  }
  return ctx;
}

/// Variante tolérante : retourne `null` hors d'un `SessionProvider`. Utile
/// pour les composants partagés entre la vitrine publique (sans provider) et
/// `/play` (avec), comme la barre de navigation.
export function useOptionalSession(): SessionContextValue | null {
  return useContext(SessionContext);
}
