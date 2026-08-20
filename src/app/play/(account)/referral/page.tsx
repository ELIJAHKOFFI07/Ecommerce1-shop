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
        <div className="card-hard mt-6 rounded-2xl bg-card p-6 text-center">
          <p className="font-display text-sm font-bold text-foreground/60">Votre code</p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-[0.2em] text-primary">
            {profile.referral_code}
          </p>
          <button
            onClick={copy}
            className="card-hard-sm mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 font-display text-sm font-bold text-background transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
          >
            <Copy className="h-4 w-4" strokeWidth={2.5} />{" "}
            {copied ? "Copié !" : "Copier"}
          </button>
        </div>
      ) : (
        <div className="card-hard mt-6 rounded-2xl bg-card p-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border-2 border-border bg-primary text-primary-foreground">
            <Gift className="h-6 w-6" strokeWidth={2.5} />
          </span>
          <p className="mt-3 text-sm font-semibold text-foreground/60">
            Connectez-vous pour obtenir votre code de parrainage.
          </p>
          <Link
            href="/play/login"
            className="card-hard-sm mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 font-display text-sm font-bold text-background transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
          >
            Se connecter
          </Link>
        </div>
      )}

      {profile && !profile.referred_by && (
        <form
          onSubmit={redeem}
          className="card-hard mt-4 rounded-2xl bg-card p-6"
        >
          <h2 className="font-display text-lg font-extrabold text-foreground">
            Vous avez été parrainé ?
          </h2>
          <p className="mt-1 text-xs font-semibold text-foreground/60">
            Saisissez le code de votre parrain pour gagner 100 points.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={sponsorCode}
              onChange={(e) => setSponsorCode(e.target.value.toUpperCase())}
              placeholder="CODE PARRAIN"
              className="flex-1 rounded-xl border-2 border-border bg-background px-3 py-2.5 text-sm font-semibold tracking-[0.15em] text-foreground outline-none placeholder:text-foreground/40 focus:border-primary"
            />
            <button
              type="submit"
              disabled={redeeming || !sponsorCode.trim()}
              className="card-hard-sm shrink-0 rounded-full bg-foreground px-5 py-2.5 font-display text-sm font-bold text-background transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
            >
              {redeeming ? "…" : "Valider"}
            </button>
          </div>
          {redeemMessage && (
            <p className="mt-3 text-sm font-semibold text-foreground/60">
              {redeemMessage}
            </p>
          )}
        </form>
      )}

      {myRank != null && (
        <div className="card-hard mt-4 flex items-center justify-center gap-2 rounded-2xl bg-sun p-4 font-display text-base font-extrabold text-foreground">
          <Trophy className="h-5 w-5" strokeWidth={2.5} /> Votre rang : #{myRank}
        </div>
      )}

      <h2 className="mt-10 font-display text-lg font-extrabold text-foreground">
        Classement des parrains
      </h2>
      {leaderboard.length === 0 ? (
        <p className="py-10 text-center font-semibold text-foreground/60">
          Aucun classement pour le moment. Soyez le premier à parrainer !
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {leaderboard.map((entry, i) => {
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
            return (
              <li
                key={entry.user_id}
                className="card-hard flex items-center gap-3 rounded-2xl bg-card p-3"
              >
                <span className="w-8 shrink-0 text-center font-display font-bold text-foreground">
                  {medal}
                </span>
                {entry.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.avatar_url}
                    alt={entry.username}
                    className="h-9 w-9 shrink-0 rounded-full border-2 border-border object-cover"
                  />
                ) : (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-border bg-primary font-display text-sm font-extrabold text-primary-foreground">
                    {entry.username.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate font-display text-sm font-bold text-foreground">
                  {entry.username}
                </span>
                <span className="shrink-0 font-display text-sm font-extrabold text-foreground/70">
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
