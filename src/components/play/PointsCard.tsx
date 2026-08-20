"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import {
  POINTS_FCFA_PER_POINT,
  POINTS_MIN_REDEEM,
  formatFcfa,
} from "@/lib/types";

/// Conversion des points fidélité en coupon (RPC redeem_points).
export function PointsCard({
  points,
  onRedeemed,
}: {
  points: number;
  onRedeemed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redeem = async () => {
    const input = window.prompt(
      `Points à convertir (min ${POINTS_MIN_REDEEM}, solde ${points}) — 1 point = ${POINTS_FCFA_PER_POINT} FCFA :`,
      String(points),
    );
    if (!input) return;
    const value = Number(input);
    if (!Number.isInteger(value) || value < POINTS_MIN_REDEEM || value > points) {
      setError(`Entre ${POINTS_MIN_REDEEM} et ${points} points.`);
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error: rpcError } = await createClient().rpc("redeem_points", {
      p_points: value,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setResult(data as string);
    onRedeemed();
  };

  return (
    <div className="card-hard flex items-center gap-3 rounded-2xl bg-card p-4 sm:gap-4 sm:p-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-border bg-primary text-primary-foreground">
        <Star className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-bold text-foreground">
          {points} points fidélité
        </p>
        <p className="text-xs font-semibold text-foreground/60">
          ≈ {formatFcfa(points * POINTS_FCFA_PER_POINT)} en coupons
        </p>
        {result && (
          <p className="mt-1 text-xs font-semibold text-vert-deep">
            Coupon créé : <span className="font-mono font-bold">{result}</span> —
            utilisez-le au paiement.
          </p>
        )}
        {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
      </div>
      <button
        onClick={redeem}
        disabled={busy || points < POINTS_MIN_REDEEM}
        className="card-hard-sm shrink-0 rounded-full bg-foreground px-4 py-2 font-display text-sm font-bold text-background transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-40 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
      >
        Convertir
      </button>
    </div>
  );
}
