"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarX, Sparkles, Star } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { HeaderSkeleton } from "@/components/Skeleton";
import { PageHeader } from "@/components/play/PageHeader";
import {
  SPIN_SEGMENTS,
  canSpinToday,
  spinResultLabel,
  type SpinPrizeKind,
  type SpinReward,
} from "@/lib/types";

const SLICE = 360 / SPIN_SEGMENTS.length;

/// Couleurs de la roue : une teinte distincte par lot, pour que les segments
/// se lisent d'un coup d'œil. Les tokens de l'identité (--sun/--vert/--orange)
/// restent sur les lots « maison » ; le bleu et le rouge viennent de la
/// palette Tailwind (--color-blue-500/--color-red-500) pour compléter sans
/// coder de couleur en dur. Le texte posé sur chaque segment utilise le
/// foreground adapté à sa teinte (les accents clairs du mode sombre portent
/// du texte foncé, les teintes vives du texte blanc).
const SEGMENT_STYLE: Record<string, { bg: string; fg: string }> = {
  "nothing-0": { bg: "var(--sun)", fg: "var(--ink)" },
  "points-10": { bg: "var(--vert)", fg: "var(--secondary-foreground)" },
  "points-50": { bg: "var(--color-blue-500)", fg: "white" },
  "coupon-5": { bg: "var(--orange)", fg: "var(--primary-foreground)" },
  "coupon-15": { bg: "var(--color-red-500)", fg: "white" },
};

function segmentKey(kind: SpinPrizeKind, value: number): string {
  return `${kind}-${value}`;
}

/// Libellés typographiques des segments : la valeur en grand caractère,
/// l'unité réduite et grisée en dessous — hiérarchie lisible pendant la
/// rotation.
const SEGMENT_LABEL: Record<string, { value: string; unit: string }> = {
  "nothing-0": { value: "?", unit: "demain" },
  "points-10": { value: "+10", unit: "pts" },
  "points-50": { value: "+50", unit: "pts" },
  "coupon-5": { value: "-5%", unit: "coupon" },
  "coupon-15": { value: "-15%", unit: "coupon" },
};

/// Rayon auquel le centre de chaque libellé se pose (distance du centre de la
/// roue), en pixels — la moitié du rayon de la roue, calé entre moyeu et bord.
const LABEL_RADIUS = 78;

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
    return (
      <div className="space-y-6">
        <HeaderSkeleton />
        <SkeletonWheel />
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

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Roue de la chance"
        subtitle="Un tour par jour — points et coupons à gagner"
      />

      <div className="relative">
        {/* Motif wax derrière la carte : l'ombre dure card-hard tombe dessus. */}
        <div className="absolute inset-0 -z-10 rounded-3xl wax-pattern" aria-hidden />

        <div className="card-hard relative rounded-3xl bg-paper px-6 py-8 text-center sm:px-8">
          <Sparkles
            className="absolute -top-2 -right-1 h-7 w-7 animate-float text-sun"
            strokeWidth={2.5}
            aria-hidden
          />
          <Sparkles
            className="absolute -bottom-2 -left-1 h-6 w-6 animate-float text-vert"
            style={{ animationDelay: "1.2s" }}
            strokeWidth={2.5}
            aria-hidden
          />

          <div className="relative mx-auto h-64 w-64 sm:h-72 sm:w-72">
            {/* Pointeur */}
            <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2">
              <div className="h-0 w-0 border-x-[14px] border-t-[24px] border-x-transparent border-t-ink" />
            </div>

            <div
              className="h-full w-full rounded-full border-4 border-border transition-transform duration-[3200ms] ease-out"
              style={{
                transform: `rotate(${angle}deg)`,
                background: `conic-gradient(${SPIN_SEGMENTS.map(
                  (segment, i) =>
                    `${SEGMENT_STYLE[segmentKey(segment.kind, segment.value)].bg} ${i * SLICE}deg ${(i + 1) * SLICE}deg`,
                ).join(", ")})`,
              }}
            >
              {SPIN_SEGMENTS.map((segment, i) => {
                const key = segmentKey(segment.kind, segment.value);
                const label = SEGMENT_LABEL[key];
                return (
                  <span
                    key={`${segment.kind}-${segment.value}`}
                    className="absolute left-1/2 top-1/2 flex w-24 flex-col items-center text-center leading-none"
                    style={{
                      // Centre le libellé sur la roue, le pousse le long du
                      // rayon puis fait orbiter autour du centre : chaque
                      // texte se pose au milieu de sa part.
                      transform: `translate(-50%, -50%) rotate(${i * SLICE + SLICE / 2}deg) translateY(-${LABEL_RADIUS}px)`,
                      color: SEGMENT_STYLE[key].fg,
                    }}
                  >
                    <span className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                      {label.value}
                    </span>
                    <span className="mt-1 font-display text-[10px] font-bold uppercase tracking-widest opacity-70 sm:text-xs">
                      {label.unit}
                    </span>
                  </span>
                );
              })}
            </div>

            {/* Moyeu central */}
            <div className="absolute left-1/2 top-1/2 z-10 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-paper bg-ink shadow-hard">
              <Star className="h-6 w-6 fill-sun text-sun" strokeWidth={2} />
            </div>
          </div>

          {result && (
            <div className="card-hard-sm mt-8 animate-rise rounded-2xl bg-sun px-4 py-3 font-display text-base font-extrabold text-ink">
              {spinResultLabel(result)}
            </div>
          )}
          {error && (
            <p className="mt-8 text-sm font-semibold text-red-600">{error}</p>
          )}
          {!result && !error && !canSpin && (
            <p className="mt-8 inline-flex items-center gap-2 rounded-full border-2 border-border bg-paper px-4 py-2 text-sm font-semibold text-ink/60">
              <CalendarX className="h-4 w-4" strokeWidth={2.5} />
              Vous avez déjà joué aujourd&apos;hui. Revenez demain !
            </p>
          )}

          <button
            onClick={spin}
            disabled={!canSpin || spinning}
            className="card-hard-sm mt-8 inline-flex items-center gap-2 rounded-full bg-orange px-8 py-3 font-display text-base font-bold text-on-accent transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-40 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
          >
            <Sparkles className="h-4 w-4" strokeWidth={2.5} />
            {spinning ? "Ça tourne…" : "Lancer la roue"}
          </button>
        </div>
      </div>

      {/* Légende : la couleur n'est jamais le seul canal — chaque lot est
          libellé, avec sa pastille de la couleur du segment. */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {SPIN_SEGMENTS.map((segment) => (
          <div
            key={`legend-${segment.kind}-${segment.value}`}
            className="card-hard-sm flex items-center gap-2 rounded-full bg-paper px-3 py-1.5"
          >
            <span
              className="h-3 w-3 rounded-full border-2 border-ink"
              style={{
                backgroundColor:
                  SEGMENT_STYLE[segmentKey(segment.kind, segment.value)].bg,
              }}
              aria-hidden
            />
            <span className="font-display text-xs font-bold text-ink">
              {segment.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonWheel() {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="card-hard rounded-3xl bg-paper p-8">
        <div className="mx-auto h-64 w-64 animate-shimmer rounded-full bg-surface-2" />
        <div className="mx-auto mt-8 h-12 w-48 animate-shimmer rounded-full bg-surface-2" />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-28 animate-shimmer rounded-full bg-surface-2"
          />
        ))}
      </div>
    </div>
  );
}
