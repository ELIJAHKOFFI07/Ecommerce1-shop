"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import type { Wishlist } from "@/lib/types";
import { HeaderSkeleton, ListSkeleton } from "@/components/Skeleton";
import { PageHeader } from "@/components/play/PageHeader";

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
        <p className="font-semibold text-ink/60">Connectez-vous pour créer des listes.</p>
        <Link
          href="/play/login"
          className="card-hard-sm mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-display text-sm font-bold text-cream transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Mes listes" subtitle="Organisez vos envies par thème (cadeaux, à surveiller…)." />

      <div className="mt-6 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Ex : Idées cadeaux"
          className="flex-1 rounded-xl border-2 border-border bg-paper px-3 py-2.5 text-sm font-semibold text-ink outline-none placeholder:text-ink/40 focus:border-orange"
        />
        <button
          onClick={create}
          disabled={creating || !newName.trim()}
          className="card-hard-sm inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 font-display text-sm font-bold text-cream transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-40 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Créer
        </button>
      </div>

      {wishlists.length === 0 ? (
        <p className="py-16 text-center font-semibold text-ink/60">
          Aucune liste pour le moment.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {wishlists.map((w) => (
            <li
              key={w.id}
              className="card-hard flex items-center gap-3 rounded-2xl bg-paper p-4"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-border bg-orange text-white">
                <Bookmark className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <Link href={`/play/wishlists/${w.id}`} className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-bold text-ink">
                  {w.name}
                </p>
                <p className="text-xs font-semibold text-ink/60">
                  {w.wishlist_items?.length ?? 0} article(s)
                </p>
              </Link>
              <button
                onClick={() => remove(w.id)}
                className="card-hard-sm grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper text-ink/70 transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:text-red-600 hover:shadow-none"
                aria-label={`Supprimer ${w.name}`}
              >
                <Trash2 className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
