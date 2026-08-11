"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Gift, Trophy } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import type { Profile, ReferralLeaderboardEntry } from "@/lib/types";
import { HeaderSkeleton, ListSkeleton } from "@/components/Skeleton";
import { PageHeader } from "@/components/play/PageHeader";

export default function ReferralPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [leaderboard, setLeaderboard] = useState<ReferralLeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sponsorCode, setSponsorCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState<string | null>(null);

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

  /// Rattache un parrain après coup. La RPC redeem_referral ignore
  /// silencieusement un code inconnu, un auto-parrainage ou un second
  /// rattachement — le message reste donc volontairement neutre.
  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = sponsorCode.trim();
    if (!code) return;
    setRedeeming(true);
    setRedeemMessage(null);
    const { error } = await createClient().rpc("redeem_referral", {
      p_code: code,
    });
    setRedeeming(false);
    if (error) {
      setRedeemMessage(error.message);
      return;
    }
    setSponsorCode("");
    setRedeemMessage("Code enregistré. Vos points seront crédités si le code est valide.");
    await load();
  };

  if (loading) return <div className="space-y-6"><HeaderSkeleton /><ListSkeleton count={5} /></div>;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Parrainage" subtitle="Votre filleul gagne 100 points à l&apos;inscription, et vous 200 points dès sa première commande livrée." />

      {profile?.referral_code ? (
        <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-muted">Votre code</p>
          <p className="mt-2 text-3xl font-bold tracking-[0.2em] text-accent">
            {profile.referral_code}
          </p>
          <button
            onClick={copy}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:border-accent"
          >
            <Copy className="h-4 w-4" /> {copied ? "Copié !" : "Copier"}
          </button>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-center">
          <Gift className="mx-auto h-8 w-8 text-accent" />
          <p className="mt-3 text-sm text-muted">
            Connectez-vous pour obtenir votre code de parrainage.
          </p>
          <Link
            href="/play/login"
            className="mt-4 inline-block rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background"
          >
            Se connecter
          </Link>
        </div>
      )}

      {profile && !profile.referred_by && (
        <form
          onSubmit={redeem}
          className="mt-4 rounded-xl border border-border bg-surface p-6"
        >
          <h2 className="font-semibold">Vous avez été parrainé ?</h2>
          <p className="mt-1 text-xs text-muted">
            Saisissez le code de votre parrain pour gagner 100 points.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={sponsorCode}
              onChange={(e) => setSponsorCode(e.target.value.toUpperCase())}
              placeholder="CODE PARRAIN"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm tracking-[0.15em]"
            />
            <button
              type="submit"
              disabled={redeeming || !sponsorCode.trim()}
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
            >
              {redeeming ? "…" : "Valider"}
            </button>
          </div>
          {redeemMessage && (
            <p className="mt-3 text-sm text-muted">{redeemMessage}</p>
          )}
        </form>
      )}

      {myRank != null && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-accent bg-accent/10 p-4 font-semibold">
          <Trophy className="h-5 w-5 text-accent" /> Votre rang : #{myRank}
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
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
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
