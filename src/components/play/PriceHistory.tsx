"use client";

import { useCallback, useEffect, useState } from "react";
import { TrendingDown } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { formatFcfa, type PriceHistoryEntry } from "@/lib/types";

/// Courbe d'évolution du prix ; masquée sous deux points d'historique.
export function PriceHistory({ productId }: { productId: string }) {
  const [entries, setEntries] = useState<PriceHistoryEntry[]>([]);

  const load = useCallback(async () => {
    const { data } = await createClient()
      .from("price_history")
      .select("price, created_at")
      .eq("product_id", productId)
      .order("created_at");
    setEntries((data as PriceHistoryEntry[]) ?? []);
  }, [productId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (entries.length < 2) return null;

  const prices = entries.map((e) => e.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const isLowest = prices[prices.length - 1] <= min;

  const width = 280;
  const height = 56;
  const points = prices
    .map((p, i) => {
      const x = (width * i) / (prices.length - 1);
      const y = 4 + (height - 8) * (1 - (p - min) / range);
      return `${x},${y}`;
    })
    .join(" ");
  const [lastX, lastY] = points.split(" ").pop()!.split(",");

  return (
    <div className="mt-4 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold">
          <TrendingDown className="h-4 w-4 text-accent" /> Historique du prix
        </p>
        {isLowest && (
          <span className="rounded-md bg-green-500/15 px-2 py-0.5 text-[11px] font-bold text-green-400">
            Prix le plus bas !
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-2 h-14 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Courbe d'évolution du prix"
      >
        <polyline
          points={points}
          fill="none"
          stroke="#E6C15C"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx={lastX} cy={lastY} r="3.5" fill="#E6C15C" />
      </svg>
      <p className="mt-1 text-xs text-muted">
        Min : {formatFcfa(min)} · Max : {formatFcfa(max)}
      </p>
    </div>
  );
}
