"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Gift, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ReferralLeaderboardEntry } from "@/lib/types";

export default function ReferralPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [leaderboard, setLeaderboard] = useState<ReferralLeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const [profileRes, rankRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userData.user.id).maybeSingle(),
        supabase.rpc("my_referral_rank"),
      ]);
      setProfile(profileRes.data as Profile | null);
      setMyRank((rankRes.data as number | null) ?? null);
    }
    const { data } = await supabase.rpc("referral_leaderboard", { p_limit: 20 });
    setLeaderboard((data as ReferralLeaderboardEntry[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const copy = async () => {
    if (!profile?.referral_code) return;
    await navigator.clipboard.writeText(profile.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <p className="py-20 text-center text-muted">Chargement…</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Parrainage</h1>
      <p className="mt-1 text-sm text-muted">
        Votre filleul gagne 100 points à l&apos;inscription, et vous 200 points dès
        sa première commande livrée.
      </p>

      {profile?.referral_code ? (
        <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-muted">Votre code</p>
          <p className="mt-2 text-3xl font-bold tracking-[0.2em] text-gold">
            {profile.referral_code}
          </p>
          <button
            onClick={copy}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:border-gold"
          >
            <Copy className="h-4 w-4" /> {copied ? "Copié !" : "Copier"}
          </button>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-center">
          <Gift className="mx-auto h-8 w-8 text-gold" />
          <p className="mt-3 text-sm text-muted">
            Connectez-vous pour obtenir votre code de parrainage.
          </p>
          <Link
            href="/play/login"
            className="mt-4 inline-block rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-black"
          >
            Se connecter
          </Link>
        </div>
      )}

      {myRank != null && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-gold bg-gold/10 p-4 font-semibold">
          <Trophy className="h-5 w-5 text-gold" /> Votre rang : #{myRank}
        </div>
      )}

      <h2 className="mt-10 text-lg font-semibold">Classement des parrains</h2>
      {leaderboard.length === 0 ? (
        <p className="py-10 text-center text-muted">
          Aucun classement pour le moment. Soyez le premier à parrainer !
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {leaderboard.map((entry, i) => {
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
            return (
              <li
                key={entry.user_id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
              >
                <span className="w-8 text-center">{medal}</span>
                {entry.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.avatar_url}
                    alt={entry.username}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold">
                    {entry.username.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="flex-1 truncate">{entry.username}</span>
                <span className="text-sm font-bold">
                  {entry.referrals_count} filleul(s)
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
