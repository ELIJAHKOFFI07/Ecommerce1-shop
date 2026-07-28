"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Gavel, Timer } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import {
  auctionRemainingLabel,
  formatFcfa,
  type Auction,
} from "@/lib/types";

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    // Clôture paresseuse des enchères échues avant de lister.
    await supabase.rpc("settle_expired_auctions");
    const { data } = await supabase
      .from("auctions")
      .select("*, products(*, product_images(url, position), shops(*))")
      .eq("status", "active")
      .order("ends_at");
    setAuctions((data as Auction[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (loading) return <p className="py-20 text-center text-muted">Chargement…</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Gavel className="h-6 w-6 text-gold" /> Enchères en cours
      </h1>

      {auctions.length === 0 ? (
        <p className="py-16 text-center text-muted">
          Aucune enchère en cours. Les vendeurs peuvent en lancer depuis leur
          fiche produit.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {auctions.map((a) => (
            <Link
              key={a.id}
              href={`/play/product/${a.product_id}`}
              className="flex items-center gap-4 rounded-xl border border-border bg-surface p-3 hover:border-gold/50"
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                {a.products?.product_images?.[0]?.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.products.product_images[0].url}
                    alt={a.products?.title ?? ""}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium">
                  {a.products?.title}
                </p>
                <p className="mt-1 text-sm font-bold text-gold">
                  {a.current_bid == null
                    ? `Départ : ${formatFcfa(a.starting_price)}`
                    : `Offre : ${formatFcfa(a.current_bid)} (${a.bids_count})`}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                  <Timer className="h-3 w-3" />
                  {auctionRemainingLabel(a.ends_at)}
                </p>
              </div>
              <Gavel className="h-5 w-5 shrink-0 text-gold" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
