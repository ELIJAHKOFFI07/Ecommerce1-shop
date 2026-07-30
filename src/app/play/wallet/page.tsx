"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import {
  formatFcfa,
  relativeTime,
  WALLET_KIND_LABELS,
  type PlatformSettings,
  type WalletTransaction,
} from "@/lib/types";
import { HeaderSkeleton, ListSkeleton, Skeleton } from "@/components/Skeleton";

export default function WalletPage() {
  const [connected, setConnected] = useState(true);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [minWithdrawal, setMinWithdrawal] = useState(5000);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setConnected(false);
      setLoading(false);
      return;
    }
    // Le solde et l'historique sont en lecture seule côté client : seule la
    // RPC request_withdrawal (SECURITY DEFINER) peut débiter le portefeuille.
    const [walletRes, txRes, settingsRes] = await Promise.all([
      supabase.from("wallets").select("balance").eq("user_id", userData.user.id).maybeSingle(),
      supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("platform_settings").select("*").maybeSingle(),
    ]);
    setBalance((walletRes.data?.balance as number | undefined) ?? 0);
    setTransactions((txRes.data as WalletTransaction[]) ?? []);
    const settings = settingsRes.data as PlatformSettings | null;
    if (settings) setMinWithdrawal(settings.min_withdrawal);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const withdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Montant invalide.");
      return;
    }
    if (!phone.trim()) {
      setError("Numéro de téléphone requis.");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    // Montant minimum et solde revalidés côté serveur (platform_settings).
    const { error: rpcError } = await supabase.rpc("request_withdrawal", {
      p_amount: Math.trunc(value),
      p_phone: phone.trim(),
    });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setSuccess("Demande de retrait enregistrée.");
    setAmount("");
    setPhone("");
    await load();
  };

  if (loading) return (<div className="mx-auto max-w-4xl space-y-6"><HeaderSkeleton /><Skeleton className="h-28 w-full rounded-xl" /><Skeleton className="h-56 w-full rounded-xl" /><ListSkeleton count={4} /></div>);

  if (!connected) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <Wallet className="mx-auto h-8 w-8 text-gold" />
        <p className="mt-3 text-sm text-muted">
          Connectez-vous pour consulter votre portefeuille.
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

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">Portefeuille</h1>
      <p className="mt-1 text-sm text-muted">
        Vos ventes livrées sont créditées ici, commission déduite.
      </p>

      {/* Deux colonnes dès `lg` : le solde et le formulaire restent visibles
          pendant qu'on parcourt l'historique, au lieu de défiler hors écran. */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[22rem_1fr] lg:items-start">
      <div className="space-y-6 lg:sticky lg:top-20">
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted">Solde disponible</p>
        <p className="mt-2 text-3xl font-bold text-gold">{formatFcfa(balance)}</p>
      </div>

      <form
        onSubmit={withdraw}
        className="rounded-xl border border-border bg-surface p-6"
      >
        <h2 className="font-semibold">Demander un retrait</h2>
        <p className="mt-1 text-xs text-muted">
          Minimum {formatFcfa(minWithdrawal)}.
        </p>
        <div className="mt-4 space-y-3">
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Montant en FCFA"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Numéro Mobile Money"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        {success && <p className="mt-3 text-sm text-green-500">{success}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
        >
          {submitting ? "Envoi…" : "Demander le retrait"}
        </button>
      </form>
      </div>

      <div>
      <h2 className="text-lg font-semibold">Historique</h2>
      {transactions.length === 0 ? (
        <p className="py-10 text-center text-muted">
          Aucun mouvement pour le moment.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {transactions.map((tx) => {
            const positive = tx.amount > 0;
            return (
              <li
                key={tx.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    positive ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500"
                  }`}
                >
                  {positive ? (
                    <ArrowDownLeft className="h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </span>
                <span className="flex-1">
                  <span className="block text-sm">
                    {WALLET_KIND_LABELS[tx.kind] ?? tx.kind}
                  </span>
                  <span className="block text-xs text-muted">
                    {tx.note ?? relativeTime(tx.created_at)}
                  </span>
                </span>
                <span
                  className={`text-sm font-bold ${
                    positive ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {positive ? "+" : ""}
                  {formatFcfa(tx.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      </div>
      </div>
    </div>
  );
}
