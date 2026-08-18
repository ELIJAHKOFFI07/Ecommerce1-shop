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
          className="card-hard-sm press inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-sm font-display font-bold text-foreground transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
        >
          <Gavel className="h-4 w-4 text-accent" /> Mettre aux enchères
        </button>
        {message && <p className="mt-2 text-xs text-accent">{message}</p>}
      </div>
    );
  }

  const leading = myId != null && auction.current_bidder === myId;

  return (
    <div className="card-hard rounded-3xl bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-display text-sm font-extrabold">
          <Gavel className="h-4 w-4 text-accent" /> Enchère en cours
        </p>
        <span className="rounded-full border-2 border-border bg-sun px-2.5 py-0.5 text-[11px] font-bold">
          {auctionRemainingLabel(auction.ends_at)}
        </span>
      </div>
      <p className="mt-2.5 text-lg font-extrabold text-accent">
        {auction.current_bid == null
          ? `Prix de départ : ${formatFcfa(auction.starting_price)}`
          : `Meilleure offre : ${formatFcfa(auction.current_bid)} · ${auction.bids_count} enchère(s)`}
      </p>
      {leading && (
        <p className="mt-1 text-xs text-green-400">Vous menez cette enchère 🏆</p>
      )}
      {!isOwner && (
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={minNextBid(auction)}
            className="card-hard-sm w-32 rounded-full bg-surface px-3 py-1.5 text-sm outline-none transition-all focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-[4px_4px_0_0_var(--accent)]"
          />
          <button
            onClick={bid}
            disabled={busy}
            className="card-hard-sm press inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-sm font-display font-bold text-background transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-40"
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
