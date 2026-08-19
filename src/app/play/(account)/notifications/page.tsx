"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { relativeTime, type AppNotification } from "@/lib/types";
import { HeaderSkeleton, ListSkeleton } from "@/components/Skeleton";
import { PageHeader } from "@/components/play/PageHeader";

/// Icône par type de notification émis par les RPC serveur
/// (order, offer, auction, message, price_drop).
const TYPE_EMOJI: Record<string, string> = {
  order: "📦",
  offer: "💬",
  auction: "🔨",
  message: "✉️",
  price_drop: "📉",
  info: "🔔",
};

export default function NotificationsPage() {
  const [connected, setConnected] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setConnected(false);
      setLoading(false);
      return null;
    }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((data as AppNotification[]) ?? []);
    setLoading(false);
    return userData.user.id;
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().then((userId) => {
      if (!userId) return;
      // La table notifications est déjà publiée dans supabase_realtime
      // (voir supabase/schema.sql) : les nouvelles arrivent sans rafraîchir.
      channel = supabase
        .channel("notifications-feed")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            setNotifications((prev) => [
              payload.new as AppNotification,
              ...prev,
            ]);
          },
        )
        .subscribe();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [load]);

  const markAllRead = async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const now = new Date().toISOString();
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", userData.user.id)
      .is("read_at", null);
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: now })),
    );
  };

  if (loading) return (<div className="mx-auto max-w-4xl space-y-6"><HeaderSkeleton /><ListSkeleton count={6} /></div>);

  if (!connected) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border-2 border-border bg-orange text-white">
          <Bell className="h-6 w-6" strokeWidth={2.5} />
        </span>
        <p className="mt-3 text-sm font-semibold text-ink/60">
          Connectez-vous pour voir vos notifications.
        </p>
        <Link
          href="/play/login"
          className="card-hard-sm mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-display text-sm font-bold text-cream transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Notifications"
        action={
          unread > 0 ? (
            <button
              onClick={markAllRead}
              className="card-hard-sm inline-flex items-center gap-2 rounded-full bg-paper px-3.5 py-2 font-display text-xs font-bold text-ink transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-orange-soft hover:shadow-none"
            >
              <CheckCheck className="h-4 w-4" strokeWidth={2.5} /> Tout marquer
              comme lu
            </button>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <p className="py-20 text-center font-semibold text-ink/60">
          Aucune notification pour le moment.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 xl:grid-cols-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`card-hard flex gap-3 rounded-2xl p-3 ${
                n.read_at ? "bg-paper" : "bg-orange-soft"
              }`}
            >
              <span className="text-xl leading-none">{TYPE_EMOJI[n.type] ?? "🔔"}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-sm font-bold text-ink">
                  {n.title}
                </span>
                <span className="block text-sm font-semibold text-ink/60">
                  {n.body}
                </span>
                <span className="mt-1 block text-xs font-semibold text-ink/60">
                  {relativeTime(n.created_at)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
