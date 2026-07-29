"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Bookmark,
  Gift,
  Handshake,
  LogOut,
  MessageCircle,
  Package,
  Sparkles,
  Store,
  UserPen,
  Wallet,
} from "lucide-react";
import { ROLE_LABELS, roleOf } from "@/lib/roles";
import { createClient } from "@/lib/backend/client";
import { PointsCard } from "@/components/play/PointsCard";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import type { Profile } from "@/lib/types";
import { ListSkeleton, Skeleton } from "@/components/Skeleton";

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
    router.push("/play/login");
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
        <p className="text-lg font-medium">Connexion requise</p>
        <Link
          href="/play/login"
          className="mt-4 inline-block rounded-full bg-gold px-6 py-2.5 font-semibold text-black"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gold/15">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-gold">
              {(profile?.full_name ?? profile?.username ?? "?")[0]?.toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">
            {profile?.full_name ?? profile?.username ?? "Utilisateur"}
          </p>
          <p className="truncate text-sm text-muted">{email}</p>
          <p className="mt-1 text-sm text-gold">
            {ROLE_LABELS[roleOf(profile) ?? "user"]} ·{" "}
            {profile?.loyalty_points ?? 0} points
          </p>
        </div>
      </div>

      <Link
        href="/play/account/edit"
        className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface p-4 hover:border-gold/50"
      >
        <span className="text-gold">
          <UserPen />
        </span>
        Modifier mon profil
      </Link>

      <div className="mt-6">
        <PointsCard
          points={profile?.loyalty_points ?? 0}
          onRedeemed={refreshProfile}
        />
      </div>

      <div className="mt-4">
        <ThemeSwitcher />
      </div>

      <div className="mt-4 space-y-2">
        <AccountLink href="/play/orders" icon={<Package />} label="Mes commandes" />
        <AccountLink
          href="/play/notifications"
          icon={<Bell />}
          label="Notifications"
        />
        <AccountLink
          href="/play/messages"
          icon={<MessageCircle />}
          label="Messages"
        />
        <AccountLink href="/play/offers" icon={<Handshake />} label="Mes offres" />
        <AccountLink href="/play/wallet" icon={<Wallet />} label="Portefeuille" />
        <AccountLink href="/play/sell" icon={<Store />} label="Ma boutique / Vendre" />
        <AccountLink href="/play/wishlists" icon={<Bookmark />} label="Mes listes" />
        <AccountLink
          href="/play/spin"
          icon={<Sparkles />}
          label="Roue de la chance"
        />
        <AccountLink href="/play/referral" icon={<Gift />} label="Parrainage" />
        {profile?.is_admin && (
          <AccountLink href="/admin" icon={<Store />} label="Back-office admin" />
        )}
      </div>

      <button
        onClick={signOut}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-border py-3 font-semibold hover:border-red-500 hover:text-red-400"
      >
        <LogOut className="h-4 w-4" /> Se déconnecter
      </button>
    </div>
  );
}

function AccountLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 hover:border-gold/50"
    >
      <span className="text-gold">{icon}</span>
      {label}
    </Link>
  );
}
