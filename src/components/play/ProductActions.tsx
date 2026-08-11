"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  BellRing,
  BookmarkPlus,
  Eye,
  GitCompareArrows,
  Handshake,
  MessageCircle,
  Share2,
} from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { getCompareIds, toggleCompareId } from "@/lib/compare";
import { formatFcfa, type Product, type Wishlist } from "@/lib/types";

export function ProductActions({ product }: { product: Product }) {
  const [myId, setMyId] = useState<string | null>(null);
  const [hasAlert, setHasAlert] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [compareCount, setCompareCount] = useState(0);
  const [inCompare, setInCompare] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const ids = getCompareIds();
    setCompareCount(ids.length);
    setInCompare(ids.includes(product.id));
    const { data: userData } = await supabase.auth.getUser();
    setMyId(userData.user?.id ?? null);

    // Vue comptée serveur (dédoublonnage + "X personnes regardent").
    await supabase.rpc("register_product_view", { p_product_id: product.id });
    const { data: viewerCount } = await supabase.rpc("active_viewers", {
      p_product_id: product.id,
    });
    setViewers((viewerCount as number) ?? 0);

    if (userData.user) {
      const [alertRes, listRes] = await Promise.all([
        supabase
          .from("price_alerts")
          .select("id")
          .eq("product_id", product.id)
          .maybeSingle(),
        supabase.from("wishlists").select("*").order("created_at"),
      ]);
      setHasAlert(alertRes.data != null);
      setWishlists((listRes.data as Wishlist[]) ?? []);
    }
  }, [product.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 2500);
  };

  const toggleAlert = async () => {
    if (!myId) {
      window.location.href = "/play/login";
      return;
    }
    const supabase = createClient();
    if (hasAlert) {
      await supabase.from("price_alerts").delete().eq("product_id", product.id);
      setHasAlert(false);
      flash("Alerte retirée.");
    } else {
      await supabase.from("price_alerts").upsert({
        product_id: product.id,
        price_at_creation: product.price,
        notified: false,
      });
      setHasAlert(true);
      flash("Vous serez notifié si le prix baisse !");
    }
  };

  const addToWishlist = async (wishlistId: string) => {
    await createClient()
      .from("wishlist_items")
      .upsert({ wishlist_id: wishlistId, product_id: product.id });
    setPickerOpen(false);
    flash("Ajouté à la liste !");
  };

  const createAndAdd = async () => {
    const name = window.prompt("Nom de la nouvelle liste :");
    if (!name?.trim()) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("wishlists")
      .insert({ name: name.trim() })
      .select()
      .single();
    if (data) await addToWishlist((data as Wishlist).id);
    load();
  };

  /// Bornes (50 % à 100 % du prix) et limite de 3 offres par produit
  /// revalidées par la RPC make_offer.
  const makeOffer = async () => {
    if (!myId) {
      window.location.href = "/play/login";
      return;
    }
    const raw = window.prompt(
      `Votre prix pour « ${product.title} » (entre ${formatFcfa(
        Math.ceil(product.price * 0.5),
      )} et ${formatFcfa(product.price)}) :`,
    );
    if (raw === null) return;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      flash("Montant invalide.");
      return;
    }
    const { error } = await createClient().rpc("make_offer", {
      p_product_id: product.id,
      p_amount: Math.trunc(value),
    });
    flash(error ? error.message : "Offre envoyée au vendeur !");
  };

  const contactSeller = async () => {
    if (!myId) {
      window.location.href = "/play/login";
      return;
    }
    const { data, error } = await createClient().rpc("open_conversation", {
      p_seller_id: product.seller_id,
      p_product_id: product.id,
    });
    if (error) {
      flash(error.message);
      return;
    }
    window.location.href = `/play/messages/${data as string}`;
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `${product.title} — ${formatFcfa(product.price)} sur DreamTeamShop 🛍️\n${window.location.href}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");
  };

  return (
    <div className="mt-4 space-y-3">
      {viewers > 1 && (
        <p className="flex items-center gap-1.5 text-xs text-accent">
          <Eye className="h-3.5 w-3.5" />
          {viewers} personnes regardent ce produit
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {myId !== product.seller_id && (
          <>
            <button
              onClick={makeOffer}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:border-accent"
            >
              <Handshake className="h-4 w-4" /> Proposer un prix
            </button>
            <button
              onClick={contactSeller}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:border-accent"
            >
              <MessageCircle className="h-4 w-4" /> Contacter le vendeur
            </button>
          </>
        )}

        <button
          onClick={toggleAlert}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
            hasAlert
              ? "border-accent bg-accent/10 text-accent"
              : "border-border hover:border-accent"
          }`}
        >
          {hasAlert ? (
            <BellRing className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {hasAlert ? "Alerte activée" : "Alerte baisse de prix"}
        </button>

        <div className="relative">
          <button
            onClick={() =>
              myId ? setPickerOpen((o) => !o) : (window.location.href = "/play/login")
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:border-accent"
          >
            <BookmarkPlus className="h-4 w-4" /> Ajouter à une liste
          </button>
          {pickerOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
              {wishlists.map((w) => (
                <button
                  key={w.id}
                  onClick={() => addToWishlist(w.id)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-2"
                >
                  {w.name}
                </button>
              ))}
              <button
                onClick={createAndAdd}
                className="block w-full border-t border-border px-3 py-2 text-left text-sm text-accent hover:bg-surface-2"
              >
                + Nouvelle liste
              </button>
            </div>
          )}
        </div>

        <button
          onClick={shareWhatsApp}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:border-accent"
        >
          <Share2 className="h-4 w-4" /> WhatsApp
        </button>

        <button
          onClick={() => {
            const next = toggleCompareId(product.id);
            if (next == null) {
              flash("Comparateur plein (3 max).");
              return;
            }
            setInCompare(next.includes(product.id));
            setCompareCount(next.length);
            flash(`Comparateur : ${next.length} produit(s).`);
          }}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
            inCompare ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent"
          }`}
        >
          <GitCompareArrows className="h-4 w-4" />
          {inCompare ? "Dans le comparateur" : "Comparer"}
        </button>

        {compareCount >= 2 && (
          <a
            href="/play/compare"
            className="inline-flex items-center rounded-lg bg-foreground px-3 py-2 text-sm font-semibold text-background"
          >
            Voir la comparaison ({compareCount})
          </a>
        )}
      </div>

      {status && <p className="text-xs text-accent">{status}</p>}
    </div>
  );
}
