"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { storyRemainingLabel, type ShopStory } from "@/lib/types";

export function StoriesManager({ shopId }: { shopId: string }) {
  const [stories, setStories] = useState<ShopStory[]>([]);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await createClient()
      .from("shop_stories")
      .select("*")
      .eq("shop_id", shopId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    setStories((data as ShopStory[]) ?? []);
  }, [shopId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Non connecté");
      // Le chemin doit commencer par l'uid (policy Storage).
      const path = `${userData.user.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("shop-images")
        .upload(path, file);
      if (upErr) throw new Error(upErr.message);
      const {
        data: { publicUrl },
      } = supabase.storage.from("shop-images").getPublicUrl(path);

      const { error: insErr } = await supabase.from("shop_stories").insert({
        shop_id: shopId,
        image_url: publicUrl,
        caption: caption.trim() || null,
      });
      if (insErr) throw new Error(insErr.message);
      setCaption("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    await createClient().from("shop_stories").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-medium">Publier une story</p>
        <p className="mt-1 text-xs text-muted">
          Visible 24 h par tous les acheteurs sur l&apos;accueil.
        </p>
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Légende (optionnelle)"
          maxLength={200}
          className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
        />
        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
          className="mt-3 block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-gold file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black"
        />
        {uploading && <p className="mt-2 text-xs text-gold">Publication…</p>}
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      {stories.length === 0 ? (
        <p className="py-8 text-center text-muted">Aucune story active.</p>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-5">
          {stories.map((s) => (
            <div
              key={s.id}
              className="relative overflow-hidden rounded-lg border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.image_url}
                alt={s.caption ?? "Story"}
                className="aspect-[9/16] w-full object-cover"
              />
              <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1.5 py-1 text-center text-[10px] text-white">
                {storyRemainingLabel(s.expires_at)}
              </span>
              <button
                onClick={() => remove(s.id)}
                aria-label="Supprimer la story"
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
