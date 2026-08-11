"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import type { ShopStory } from "@/lib/types";

const SEGMENT_MS = 5000;
const TICK_MS = 50;

export function StoryViewer({
  shopId,
  shopName,
  onClose,
}: {
  shopId: string;
  shopName: string;
  onClose: () => void;
}) {
  const [stories, setStories] = useState<ShopStory[]>([]);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("shop_stories")
      .select("*")
      .eq("shop_id", shopId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at");
    setStories((data as ShopStory[]) ?? []);
  }, [shopId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Avance automatique du segment courant + marquage "vue" côté serveur.
  // La progression est dérivée du temps écoulé (pas d'accumulation par tick)
  // pour éviter la dérive et tout setState synchrone dans l'effet.
  useEffect(() => {
    if (stories.length === 0) return;
    const story = stories[index];
    if (!story) return;

    createClient().rpc("mark_story_viewed", { p_story_id: story.id });
    const startedAt = Date.now();
    timer.current = setInterval(() => {
      const ratio = (Date.now() - startedAt) / SEGMENT_MS;
      if (ratio >= 1) {
        setIndex((i) => {
          if (i < stories.length - 1) return i + 1;
          onClose();
          return i;
        });
      } else {
        setProgress(ratio);
      }
    }, TICK_MS);

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [stories, index, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, stories.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, stories.length]);

  if (stories.length === 0) return null;
  const story = stories[Math.min(index, stories.length - 1)];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="relative h-full w-full max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={story.image_url}
          alt={story.caption ?? shopName}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70" />

        {/* Zones de navigation gauche / droite */}
        <button
          aria-label="Story précédente"
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
          className="absolute inset-y-0 left-0 w-1/3"
        />
        <button
          aria-label="Story suivante"
          onClick={() =>
            setIndex((i) => {
              if (i < stories.length - 1) return i + 1;
              onClose();
              return i;
            })
          }
          className="absolute inset-y-0 right-0 w-2/3"
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 p-3">
          <div className="flex gap-1">
            {stories.map((s, i) => (
              <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded bg-white/30">
                <span
                  className="block h-full bg-accent"
                  style={{
                    width: `${i < index ? 100 : i === index ? progress * 100 : 0}%`,
                  }}
                />
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="font-bold text-white">{shopName}</p>
            <button
              onClick={onClose}
              className="pointer-events-auto rounded-full p-1 text-white hover:bg-white/20"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 space-y-3 p-4">
          {story.caption && <p className="text-white">{story.caption}</p>}
          {story.product_id && (
            <Link
              href={`/play/product/${story.product_id}`}
              className="pointer-events-auto block rounded-lg bg-accent py-2.5 text-center font-semibold text-on-accent"
            >
              Voir le produit
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
