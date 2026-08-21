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
 <p className="font-semibold text-foreground/60">Connectez-vous pour créer des listes.</p>
        <Link
          href="/play/login"
 className="mt-4 inline-flex items-center gap-2 rounded-sm bg-foreground px-5 py-2.5 font-display text-sm font-bold text-background transition-all"
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
 className="flex-1 rounded-sm border border-border bg-card px-3 py-2.5 text-sm font-semibold text-foreground outline-none placeholder:text-foreground/40 focus-visible:border-accent"
        />
        <button
          onClick={create}
          disabled={creating || !newName.trim()}
 className="inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-foreground px-4 py-2.5 font-display text-sm font-bold text-background transition-all disabled:opacity-40 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
        >
 <Plus className="h-4 w-4" strokeWidth={2.5} /> Créer
        </button>
      </div>

      {wishlists.length === 0 ? (
 <p className="py-16 text-center font-semibold text-foreground/60">
          Aucune liste pour le moment.
        </p>
      ) : (
 <ul className="mt-6 space-y-3">
          {wishlists.map((w) => (
            <li
              key={w.id}
 className="flex items-center gap-3 rounded-sm bg-card p-4"
            >
 <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border border-border bg-primary text-primary-foreground">
 <Bookmark className="h-5 w-5" strokeWidth={2.5} />
              </span>
 <Link href={`/play/wishlists/${w.id}`} className="min-w-0 flex-1">
 <p className="truncate font-display text-base font-bold text-foreground">
                  {w.name}
                </p>
 <p className="text-xs font-semibold text-foreground/60">
                  {w.wishlist_items?.length ?? 0} article(s)
                </p>
              </Link>
              <button
                onClick={() => remove(w.id)}
 className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card text-foreground/70 transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:text-red-600 hover:shadow-none"
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
