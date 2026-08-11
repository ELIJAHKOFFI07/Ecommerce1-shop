"use client";

import { useCallback, useEffect, useState } from "react";
import { Gavel } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import {
  auctionRemainingLabel,
  formatFcfa,
  minNextBid,
  type Auction,
  type Product,
} from "@/lib/types";

/// Bloc enchère de la fiche produit : surenchère pour les acheteurs,
/// création pour le propriétaire. Toute la validation réelle est serveur.
export function AuctionBlock({ product }: { product: Product }) {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: userData }, { data }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("auctions")
        .select("*")
        .eq("product_id", product.id)
        .eq("status", "active")
        .maybeSingle(),
    ]);
    setMyId(userData.user?.id ?? null);
    setAuction(data as Auction | null);
    if (data) setAmount(String(minNextBid(data as Auction)));
  }, [product.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const isOwner = myId != null && myId === product.seller_id;

  const bid = async () => {
    if (!myId) {
      window.location.href = "/play/login";
      return;
    }
    setBusy(true);
    setMessage(null);
    const { error } = await createClient().rpc("place_bid", {
      p_auction_id: auction!.id,
      p_amount: Number(amount),
    });
    setMessage(error ? error.message : "Enchère placée — vous menez ! 🏁");
    setBusy(false);
    load();
  };

  const create = async () => {
    const input = window.prompt(
      "Prix de départ (FCFA) :",
      String(Math.max(100, Math.floor(product.price / 2))),
    );
    if (!input) return;
    const { error } = await createClient().rpc("create_auction", {
      p_product_id: product.id,
      p_starting_price: Number(input),
      p_duration_hours: 72,
    });
    setMessage(error ? error.message : "Enchère lancée pour 3 jours !");
    load();
  };

  if (!auction) {
    if (!isOwner) return null;
    return (
      <div className="mt-4">
        <button
          onClick={create}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:border-accent"
        >
          <Gavel className="h-4 w-4 text-accent" /> Mettre aux enchères
        </button>
        {message && <p className="mt-2 text-xs text-accent">{message}</p>}
      </div>
    );
  }

  const leading = myId != null && auction.current_bidder === myId;

  return (
    <div className="mt-4 rounded-xl border border-accent bg-accent/[0.08] p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-bold">
          <Gavel className="h-4 w-4 text-accent" /> Enchère en cours
        </p>
        <span className="text-xs font-semibold">
          {auctionRemainingLabel(auction.ends_at)}
        </span>
      </div>
      <p className="mt-2 text-lg font-bold text-accent">
        {auction.current_bid == null
          ? `Prix de départ : ${formatFcfa(auction.starting_price)}`
          : `Meilleure offre : ${formatFcfa(auction.current_bid)} · ${auction.bids_count} enchère(s)`}
      </p>
      {leading && (
        <p className="mt-1 text-xs text-green-400">Vous menez cette enchère 🏆</p>
      )}
      {!isOwner && (
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={minNextBid(auction)}
            className="w-36 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={bid}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
          >
            <Gavel className="h-4 w-4" />
            Enchérir (min {formatFcfa(minNextBid(auction))})
          </button>
        </div>
      )}
      {message && <p className="mt-2 text-xs text-accent">{message}</p>}
    </div>
  );
}
