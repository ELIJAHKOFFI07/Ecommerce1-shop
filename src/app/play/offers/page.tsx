"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Handshake } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import {
  formatFcfa,
  OFFER_STATUS_LABELS,
  relativeTime,
  type Offer,
} from "@/lib/types";
import { HeaderSkeleton, ListSkeleton, Skeleton } from "@/components/Skeleton";
import { PageHeader } from "@/components/play/PageHeader";

export default function OffersPage() {
  const [connected, setConnected] = useState(true);
  const [sent, setSent] = useState<Offer[]>([]);
  const [received, setReceived] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"sent" | "received">("sent");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setConnected(false);
      setLoading(false);
      return;
    }

    const { data: shop } = await supabase
      .from("shops")
      .select("id")
      .eq("owner_id", userData.user.id)
      .maybeSingle();

    const sentQuery = supabase
      .from("offers")
      .select("*, products(*, product_images(url, position))")
      .eq("buyer_id", userData.user.id)
      .order("created_at", { ascending: false });

    const [sentRes, receivedRes] = await Promise.all([
      sentQuery,
      shop?.id
        ? supabase
            .from("offers")
            .select(
              "*, products(*, product_images(url, position)), profiles!offers_buyer_id_fkey(username, avatar_url)",
            )
            .eq("shop_id", shop.id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    setSent((sentRes.data as Offer[]) ?? []);
    setReceived((receivedRes.data as Offer[]) ?? []);
    if (shop?.id && ((sentRes.data as Offer[]) ?? []).length === 0) {
      setTab("received");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  /// Toutes les bornes (contre-offre > offre, <= prix produit, vendeur
  /// propriétaire) sont revalidées par la RPC respond_to_offer.
  const respond = async (
    offerId: string,
    action: "accepted" | "declined" | "countered",
  ) => {
    setError(null);
    let counter: number | null = null;
    if (action === "countered") {
      const raw = window.prompt("Montant de la contre-offre (FCFA) :");
      if (raw === null) return;
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0) {
        setError("Montant invalide.");
        return;
      }
      counter = Math.trunc(value);
    }
    setBusyId(offerId);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("respond_to_offer", {
      p_offer_id: offerId,
      p_action: action,
      p_counter_amount: counter,
    });
    setBusyId(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    await load();
  };

  if (loading) return (<div className="mx-auto max-w-4xl space-y-6"><HeaderSkeleton /><Skeleton className="h-10 w-full rounded-lg" /><ListSkeleton count={4} /></div>);

  if (!connected) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <Handshake className="mx-auto h-8 w-8 text-gold" />
        <p className="mt-3 text-sm text-muted">
          Connectez-vous pour voir vos offres.
        </p>
        <Link
          href="/play/login"
          className="mt-4 inline-block rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-black"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  const list = tab === "sent" ? sent : received;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Offres" subtitle="Proposez votre prix au vendeur, ou répondez aux offres reçues." />

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setTab("sent")}
          className={`flex-1 rounded-lg border px-4 py-2 text-sm ${
            tab === "sent" ? "border-gold text-gold" : "border-border text-muted"
          }`}
        >
          Envoyées ({sent.length})
        </button>
        <button
          onClick={() => setTab("received")}
          className={`flex-1 rounded-lg border px-4 py-2 text-sm ${
            tab === "received"
              ? "border-gold text-gold"
              : "border-border text-muted"
          }`}
        >
          Reçues ({received.length})
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      {list.length === 0 ? (
        <p className="py-16 text-center text-muted">
          {tab === "sent"
            ? "Vous n'avez envoyé aucune offre."
            : "Aucune offre reçue."}
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 xl:grid-cols-2">
          {list.map((offer) => (
            <li
              key={offer.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {offer.products ? (
                    <Link
                      href={`/play/product/${offer.product_id}`}
                      className="block truncate font-semibold hover:text-gold"
                    >
                      {offer.products.title}
                    </Link>
                  ) : (
                    <span className="font-semibold">Produit supprimé</span>
                  )}
                  {tab === "received" && offer.profiles && (
                    <span className="block text-xs text-muted">
                      par {offer.profiles.username}
                    </span>
                  )}
                  <span className="mt-1 block text-xs text-muted">
                    {relativeTime(offer.created_at)}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <span className="block font-bold text-gold">
                    {formatFcfa(offer.amount)}
                  </span>
                  <span className="block text-xs text-muted">
                    {OFFER_STATUS_LABELS[offer.status]}
                  </span>
                </div>
              </div>

              {offer.counter_amount != null && (
                <p className="mt-2 text-sm">
                  Contre-offre du vendeur :{" "}
                  <span className="font-semibold text-gold">
                    {formatFcfa(offer.counter_amount)}
                  </span>
                </p>
              )}

              {tab === "received" && offer.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button
                    disabled={busyId === offer.id}
                    onClick={() => respond(offer.id, "accepted")}
                    className="flex-1 rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
                  >
                    Accepter
                  </button>
                  <button
                    disabled={busyId === offer.id}
                    onClick={() => respond(offer.id, "countered")}
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-xs hover:border-gold disabled:opacity-50"
                  >
                    Contre-offre
                  </button>
                  <button
                    disabled={busyId === offer.id}
                    onClick={() => respond(offer.id, "declined")}
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-xs hover:border-red-500 hover:text-red-400 disabled:opacity-50"
                  >
                    Refuser
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
