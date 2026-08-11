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
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
      <Star className="h-5 w-5 shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{points} points fidélité</p>
        <p className="text-xs text-muted">
          ≈ {formatFcfa(points * POINTS_FCFA_PER_POINT)} en coupons
        </p>
        {result && (
          <p className="mt-1 text-xs text-accent">
            Coupon créé : <span className="font-mono font-bold">{result}</span> —
            utilisez-le au paiement.
          </p>
        )}
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
      <button
        onClick={redeem}
        disabled={busy || points < POINTS_MIN_REDEEM}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-40"
      >
        Convertir
      </button>
    </div>
  );
}
