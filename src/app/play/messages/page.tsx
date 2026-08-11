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
        <MessageCircle className="mx-auto h-8 w-8 text-accent" />
        <p className="mt-3 text-sm text-muted">
          Connectez-vous pour accéder à vos messages.
        </p>
        <Link
          href="/play/login"
          className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Messages" />{rows.length === 0 ? (
        <p className="py-20 text-center text-muted">
          Aucune conversation. Contactez un vendeur depuis une fiche produit.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {rows.map((c) => (
            <li key={c.id}>
              <Link
                href={`/play/messages/${c.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent/50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20 font-bold text-accent">
                  {c.otherName.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {c.otherName}
                  </span>
                  <span className="block truncate text-sm text-muted">
                    {c.last_message ?? "Nouvelle conversation"}
                  </span>
                </span>
                {c.last_message_at && (
                  <span className="shrink-0 text-xs text-muted">
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
