"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import type { Wishlist } from "@/lib/types";
import { HeaderSkeleton, ListSkeleton } from "@/components/Skeleton";

export default function WishlistsPage() {
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setAuthed(false);
      setLoading(false);
      return;
    }
    setAuthed(true);
    const { data } = await supabase
      .from("wishlists")
      .select("*, wishlist_items(product_id)")
      .order("created_at");
    setWishlists((data as Wishlist[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await createClient().from("wishlists").insert({ name: newName.trim() });
    setNewName("");
    setCreating(false);
    load();
  };

  const remove = async (id: string) => {
    await createClient().from("wishlists").delete().eq("id", id);
    load();
  };

  if (loading) return (<div className="mx-auto max-w-4xl space-y-6"><HeaderSkeleton /><ListSkeleton count={4} /></div>);

  if (authed === false) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted">Connectez-vous pour créer des listes.</p>
        <Link
          href="/play/login"
          className="mt-4 inline-block rounded-lg bg-gold px-5 py-2.5 font-semibold text-black"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">Mes listes</h1>
      <p className="mt-1 text-sm text-muted">
        Organisez vos envies par thème (cadeaux, à surveiller…).
      </p>

      <div className="mt-6 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Ex : Idées cadeaux"
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-gold"
        />
        <button
          onClick={create}
          disabled={creating || !newName.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
        >
          <Plus className="h-4 w-4" /> Créer
        </button>
      </div>

      {wishlists.length === 0 ? (
        <p className="py-16 text-center text-muted">
          Aucune liste pour le moment.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {wishlists.map((w) => (
            <li
              key={w.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"
            >
              <Bookmark className="h-5 w-5 shrink-0 text-gold" />
              <Link href={`/play/wishlists/${w.id}`} className="flex-1">
                <p className="font-medium">{w.name}</p>
                <p className="text-xs text-muted">
                  {w.wishlist_items?.length ?? 0} article(s)
                </p>
              </Link>
              <button
                onClick={() => remove(w.id)}
                className="rounded-lg p-2 text-muted hover:text-red-400"
                aria-label={`Supprimer ${w.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
