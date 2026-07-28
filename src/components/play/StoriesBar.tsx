"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/backend/client";
import type { ShopWithActiveStories } from "@/lib/types";
import { StoryViewer } from "./StoryViewer";

/// Bandeau des boutiques ayant une story active (< 24 h), façon Instagram.
export function StoriesBar() {
  const [shops, setShops] = useState<ShopWithActiveStories[]>([]);
  const [openShop, setOpenShop] = useState<ShopWithActiveStories | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("shops_with_active_stories").select("*");
    setShops((data as ShopWithActiveStories[]) ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (shops.length === 0) return null;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {shops.map((shop) => (
          <button
            key={shop.shop_id}
            onClick={() => setOpenShop(shop)}
            className="flex w-16 shrink-0 flex-col items-center gap-1"
          >
            <span className="rounded-full bg-gradient-to-br from-gold to-gold-dark p-[2.5px]">
              <span className="block overflow-hidden rounded-full border-2 border-background">
                {shop.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={shop.logo_url}
                    alt={shop.name}
                    className="h-14 w-14 object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center bg-surface-2 text-lg font-bold text-gold">
                    {shop.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
            </span>
            <span className="w-full truncate text-center text-[10px] text-muted">
              {shop.name}
            </span>
          </button>
        ))}
      </div>

      {openShop && (
        <StoryViewer
          shopId={openShop.shop_id}
          shopName={openShop.name}
          onClose={() => setOpenShop(null)}
        />
      )}
    </>
  );
}
