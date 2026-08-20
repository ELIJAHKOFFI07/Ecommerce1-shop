"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { relativeTime, type Conversation, type Profile } from "@/lib/types";
import { HeaderSkeleton, ListSkeleton } from "@/components/Skeleton";
import { PageHeader } from "@/components/play/PageHeader";

type Row = Conversation & { otherName: string };

export default function MessagesPage() {
  const [connected, setConnected] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setConnected(false);
      setLoading(false);
      return;
    }
    const me = userData.user.id;
    // RLS conversations_own : seules les conversations où l'on est
    // acheteur ou vendeur remontent.
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .order("last_message_at", { ascending: false, nullsFirst: false });
    const conversations = (data as Conversation[]) ?? [];

    const otherIds = Array.from(
      new Set(
        conversations.map((c) => (c.buyer_id === me ? c.seller_id : c.buyer_id)),
      ),
    );
    const names = new Map<string, string>();
    if (otherIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", otherIds);
      for (const p of (profiles as Pick<Profile, "id" | "username">[]) ?? []) {
        names.set(p.id, p.username);
      }
    }

    setRows(
      conversations.map((c) => ({
        ...c,
        otherName:
          names.get(c.buyer_id === me ? c.seller_id : c.buyer_id) ??
          "Utilisateur",
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (loading) return (<div className="mx-auto max-w-2xl space-y-6"><HeaderSkeleton /><ListSkeleton count={5} /></div>);

  if (!connected) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border-2 border-border bg-primary text-primary-foreground">
          <MessageCircle className="h-6 w-6" strokeWidth={2.5} />
        </span>
        <p className="mt-3 text-sm font-semibold text-foreground/60">
          Connectez-vous pour accéder à vos messages.
        </p>
        <Link
          href="/play/login"
          className="card-hard-sm mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 font-display text-sm font-bold text-background transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Messages" />{rows.length === 0 ? (
        <p className="py-20 text-center font-semibold text-foreground/60">
          Aucune conversation. Contactez un vendeur depuis une fiche produit.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((c) => (
            <li key={c.id}>
              <Link
                href={`/play/messages/${c.id}`}
                className="card-hard flex items-center gap-3 rounded-2xl bg-card p-4 transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-border bg-primary font-display text-base font-extrabold text-primary-foreground">
                  {c.otherName.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-base font-bold text-foreground">
                    {c.otherName}
                  </span>
                  <span className="block truncate text-sm font-semibold text-foreground/60">
                    {c.last_message ?? "Nouvelle conversation"}
                  </span>
                </span>
                {c.last_message_at && (
                  <span className="shrink-0 text-xs font-bold text-foreground/60">
                    {relativeTime(c.last_message_at)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
