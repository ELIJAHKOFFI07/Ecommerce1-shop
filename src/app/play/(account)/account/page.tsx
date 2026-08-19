"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Bookmark,
  LogOut,
  Package,
  UserPen,
  Wallet,
} from "lucide-react";
import { ROLE_LABELS, roleOf } from "@/lib/roles";
import { createClient } from "@/lib/backend/client";
import { PointsCard } from "@/components/play/PointsCard";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import type { Profile } from "@/lib/types";
import { ListSkeleton, Skeleton } from "@/components/Skeleton";

/// Accueil du dashboard compte : carte d'identité, accès rapides et réglages.
/// Les liens de navigation sont portés par la barre horizontale du layout
/// `(account)` (src/lib/nav.ts) — cette page ne les répète pas.
const QUICK_LINKS = [
  { href: "/play/wallet", label: "Portefeuille", icon: Wallet },
  { href: "/play/orders", label: "Mes commandes", icon: Package },
  { href: "/play/notifications", label: "Notifications", icon: Bell },
  { href: "/play/wishlists", label: "Mes listes", icon: Bookmark },
];

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      setEmail(userData.user.email ?? "");
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .maybeSingle();
      setProfile(data as Profile | null);
    })();
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    // Retour a l'espace visiteur : la vitrine reste consultable sans compte.
    router.push("/");
  }

  async function refreshProfile() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .maybeSingle();
    setProfile(data as Profile | null);
  }

  // Tant que l'état d'authentification n'est pas connu, on affiche les
  // shimmers : sans ce garde, la page rendait l'en-tête de profil avec des
  // valeurs par défaut (« Utilisateur », 0 point) avant de se corriger.
  if (authed === null) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-52 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-14 w-full rounded-xl" />
        <ListSkeleton count={6} />
      </div>
    );
  }

  if (authed === false) {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-lg font-bold">Connexion requise</p>
        <Link
          href="/play/login"
          className="card-hard-sm mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 font-display text-sm font-bold text-cream transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  const displayName = profile?.full_name ?? profile?.username ?? "Utilisateur";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  return (
    <div className="space-y-6">
      {/* ---- Carte d'identité ---- */}
      <div className="card-hard rounded-2xl bg-paper p-5 sm:p-6">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-border bg-orange-soft">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-display text-3xl font-extrabold text-orange">
                {initial}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="truncate font-display text-2xl font-extrabold tracking-tight">
              {displayName}
            </h1>
            <p className="truncate text-sm font-semibold text-ink/60">
              {email}
            </p>
            <p className="mt-2 inline-flex items-center gap-2 rounded-full border-2 border-border bg-sun px-3 py-1 font-display text-sm font-bold text-ink">
              {ROLE_LABELS[roleOf(profile) ?? "user"]} ·{" "}
              {profile?.loyalty_points ?? 0} points
            </p>
          </div>

          <Link
            href="/play/account/edit"
            className="card-hard-sm inline-flex shrink-0 items-center gap-2 rounded-full bg-paper px-5 py-2.5 font-display text-sm font-bold text-ink transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-orange-soft hover:shadow-none"
          >
            <UserPen className="h-4 w-4" strokeWidth={2.5} />
            Modifier mon profil
          </Link>
        </div>
      </div>

      {/* ---- Accès rapides ---- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="card-hard rounded-2xl bg-paper p-4 transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl border-2 border-border bg-orange text-white">
              <Icon className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <p className="mt-3 font-display text-base font-bold text-ink">
              {label}
            </p>
          </Link>
        ))}
      </div>

      {/* ---- Points, thème, déconnexion ---- */}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <PointsCard
          points={profile?.loyalty_points ?? 0}
          onRedeemed={refreshProfile}
        />

        <div className="space-y-4">
          <ThemeSwitcher />
          <button
            onClick={signOut}
            className="card-hard-sm flex w-full items-center justify-center gap-2 rounded-full bg-paper px-5 py-3 font-display text-sm font-bold text-ink transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-orange-soft hover:text-red-600 hover:shadow-none"
          >
            <LogOut className="h-4 w-4" strokeWidth={2.5} /> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}