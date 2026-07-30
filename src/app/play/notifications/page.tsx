"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { relativeTime, type AppNotification } from "@/lib/types";
import { HeaderSkeleton, ListSkeleton } from "@/components/Skeleton";

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
        <Bell className="mx-auto h-8 w-8 text-gold" />
        <p className="mt-3 text-sm text-muted">
          Connectez-vous pour voir vos notifications.
        </p>
        <Link
          href="/play/login"
          className="mt-4 inline-block rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-black"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:border-gold"
          >
            <CheckCheck className="h-4 w-4" /> Tout marquer comme lu
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="py-20 text-center text-muted">
          Aucune notification pour le moment.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 xl:grid-cols-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`flex gap-3 rounded-xl border p-3 ${
                n.read_at
                  ? "border-border bg-surface"
                  : "border-gold bg-gold/10"
              }`}
            >
              <span className="text-xl">{TYPE_EMOJI[n.type] ?? "🔔"}</span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">{n.title}</span>
                <span className="block text-sm text-muted">{n.body}</span>
                <span className="mt-1 block text-xs text-muted">
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
