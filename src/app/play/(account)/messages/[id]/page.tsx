"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import type { Message } from "@/lib/types";
import { HeaderSkeleton, ListSkeleton } from "@/components/Skeleton";

export default function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    setMyId(userData.user?.id ?? null);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at");
    setMessages((data as Message[]) ?? []);
    setLoading(false);
    // Marque les messages du correspondant comme lus.
    await supabase.rpc("mark_conversation_read", { p_conversation_id: id });
  }, [id]);

  useEffect(() => {
    const supabase = createClient();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();

    // La table messages est publiée dans supabase_realtime : le fil se met à
    // jour en direct sans polling.
    const channel = supabase
      .channel(`conversation-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming],
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setSending(true);
    setError(null);
    // L'appartenance à la conversation et le blocage éventuel sont vérifiés
    // par les policies RLS messages_insert.
    const { error: insertError } = await createClient()
      .from("messages")
      .insert({ conversation_id: id, content });
    setSending(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setDraft("");
  };

  if (loading) return <div className="space-y-6"><HeaderSkeleton /><ListSkeleton count={5} /></div>;

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <Link
        href="/play/messages"
        className="card-hard-sm inline-flex w-fit items-center gap-1.5 rounded-full bg-card px-3.5 py-2 font-display text-xs font-bold text-foreground transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-surface-2 hover:shadow-none"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.5} /> Messages
      </Link>

      <div className="mt-4 min-h-[50vh] space-y-2">
        {messages.length === 0 ? (
          <p className="py-16 text-center font-semibold text-foreground/60">
            Aucun message. Dites bonjour !
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === myId;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <span
                  className={`whitespace-pre-wrap ${
                    mine ? "bubble bubble-me" : "bubble bubble-vendor"
                  }`}
                >
                  {m.content}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}

      <form onSubmit={send} className="sticky bottom-16 mt-4 flex gap-2 md:bottom-4">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Votre message…"
          className="flex-1 rounded-full border-2 border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground outline-none placeholder:text-foreground/40 focus:border-primary"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="card-hard-sm grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
          aria-label="Envoyer"
        >
          <Send className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
