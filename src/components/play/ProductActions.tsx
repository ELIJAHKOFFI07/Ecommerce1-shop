"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellRing, BookmarkPlus, Eye, GitCompareArrows, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `${product.title} — ${formatFcfa(product.price)} sur ElijahShop 🛍️\n${window.location.href}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");
  };

  return (
    <div className="mt-4 space-y-3">
      {viewers > 1 && (
        <p className="flex items-center gap-1.5 text-xs text-gold">
          <Eye className="h-3.5 w-3.5" />
          {viewers} personnes regardent ce produit
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={toggleAlert}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
            hasAlert
              ? "border-gold bg-gold/10 text-gold"
              : "border-border hover:border-gold"
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:border-gold"
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
                className="block w-full border-t border-border px-3 py-2 text-left text-sm text-gold hover:bg-surface-2"
              >
                + Nouvelle liste
              </button>
            </div>
          )}
        </div>

        <button
          onClick={shareWhatsApp}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:border-gold"
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
            inCompare ? "border-gold bg-gold/10 text-gold" : "border-border hover:border-gold"
          }`}
        >
          <GitCompareArrows className="h-4 w-4" />
          {inCompare ? "Dans le comparateur" : "Comparer"}
        </button>

        {compareCount >= 2 && (
          <a
            href="/play/compare"
            className="inline-flex items-center rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-black"
          >
            Voir la comparaison ({compareCount})
          </a>
        )}
      </div>

      {status && <p className="text-xs text-gold">{status}</p>}
    </div>
  );
}
