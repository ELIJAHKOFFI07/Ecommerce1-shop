"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Gift, LogOut, Package, Sparkles, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PointsCard } from "@/components/play/PointsCard";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import type { Profile } from "@/lib/types";

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
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-2xl font-bold text-gold">
          {(profile?.full_name ?? profile?.username ?? "?")[0]?.toUpperCase()}
        </div>
        <div>
          <p className="text-lg font-bold">
            {profile?.full_name ?? profile?.username ?? "Utilisateur"}
          </p>
          <p className="text-sm text-muted">{email}</p>
          <p className="mt-1 text-sm text-gold">
            {profile?.loyalty_points ?? 0} points de fidélité
          </p>
        </div>
      </div>

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
