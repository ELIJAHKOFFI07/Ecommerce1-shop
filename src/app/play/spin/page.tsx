"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { HeaderSkeleton, ListSkeleton } from "@/components/Skeleton";
import {
  SPIN_SEGMENTS,
  canSpinToday,
  spinResultLabel,
  type SpinReward,
} from "@/lib/types";

const SLICE = 360 / SPIN_SEGMENTS.length;

export default function SpinPage() {
  const [lastSpinAt, setLastSpinAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [result, setResult] = useState<SpinReward | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setAuthed(false);
      setLoading(false);
      return;
    }
    setAuthed(true);
    const { data } = await supabase
      .from("spin_rewards")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLastSpinAt((data?.created_at as string) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const spin = async () => {
    setSpinning(true);
    setError(null);
    setResult(null);
    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("spin_wheel");
      if (rpcError) throw new Error(rpcError.message);
      const reward = data as SpinReward;
      const index = SPIN_SEGMENTS.findIndex(
        (s) => s.kind === reward.prize_kind && s.value === reward.prize_value,
      );
      const target = SLICE * Math.max(index, 0) + SLICE / 2;
      // 5 tours complets + angle cible, cumulés pour toujours tourner en avant.
      setAngle((a) => a + 360 * 5 + (360 - target) - (a % 360));
      setTimeout(() => {
        setResult(reward);
        setSpinning(false);
        setLastSpinAt(new Date().toISOString());
      }, 3200);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSpinning(false);
    }
  };

  const canSpin = canSpinToday(lastSpinAt);

  if (loading) {
    return <div className="space-y-6"><HeaderSkeleton /><ListSkeleton count={5} /></div>;
  }

  if (authed === false) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted">Connectez-vous pour tenter votre chance.</p>
        <a
          href="/play/login"
          className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 font-semibold text-on-accent"
        >
          Se connecter
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 text-center">
      <h1 className="text-2xl font-bold">Roue de la chance</h1>
      <p className="mt-2 text-sm text-muted">
        Tentez votre chance une fois par jour !
      </p>

      <div className="relative mx-auto mt-10 h-72 w-72">
        <div className="absolute left-1/2 top-0 z-10 -ml-3 border-x-[12px] border-t-[20px] border-x-transparent border-t-gold" />
        <div
          className="h-full w-full rounded-full border-4 border-background shadow-lg transition-transform duration-[3200ms] ease-out"
          style={{
            transform: `rotate(${angle}deg)`,
            background: `conic-gradient(${SPIN_SEGMENTS.map(
              (_, i) =>
                `${i % 2 === 0 ? "#E6C15C" : "#B8933A"} ${i * SLICE}deg ${(i + 1) * SLICE}deg`,
            ).join(", ")})`,
          }}
        >
          {SPIN_SEGMENTS.map((segment, i) => (
            <span
              key={`${segment.kind}-${segment.value}`}
              className="absolute left-1/2 top-1/2 w-20 origin-[0_0] text-[10px] font-bold text-on-accent"
              style={{
                transform: `rotate(${i * SLICE + SLICE / 2 - 90}deg) translate(70px, -8px)`,
              }}
            >
              {segment.label}
            </span>
          ))}
        </div>
      </div>

      {result && (
        <div className="mt-8 rounded-xl border border-accent bg-accent/10 p-4 font-semibold">
          {spinResultLabel(result)}
        </div>
      )}
      {error && <p className="mt-8 text-sm text-red-400">{error}</p>}
      {!result && !error && !canSpin && (
        <p className="mt-8 text-sm text-muted">
          Vous avez déjà joué aujourd&apos;hui. Revenez demain !
        </p>
      )}

      <button
        onClick={spin}
        disabled={!canSpin || spinning}
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-semibold text-on-accent disabled:opacity-40"
      >
        <Sparkles className="h-4 w-4" />
        {spinning ? "Ça tourne…" : "Lancer la roue"}
      </button>
    </div>
  );
}
