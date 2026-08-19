"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { useSession } from "@/lib/session";
import { HeaderSkeleton, Skeleton } from "@/components/Skeleton";

function PasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { profile, loading, refresh } = useSession();
  const forced = params.get("obligatoire") === "1";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: updErr } = await supabase.auth.updateUser({ password });
    if (updErr) {
      setSaving(false);
      setError(updErr.message);
      return;
    }
    // Le drapeau n'est levé qu'après un changement réel : la colonne n'est
    // pas accessible en écriture au client, seule cette RPC la remet à false.
    await supabase.rpc("clear_password_change_flag");
    await refresh();
    setSaving(false);
    router.push("/play/account");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-sm space-y-4">
        <HeaderSkeleton />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-lg font-bold">Connexion requise</p>
        <Link
          href="/play/login"
          className="card-hard-sm mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 font-display text-sm font-bold text-cream transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  const field =
    "w-full rounded-xl border-2 border-border bg-cream px-4 py-3 text-sm font-semibold text-ink outline-none placeholder:text-ink/40 focus:border-orange";

  return (
    <div className="mx-auto max-w-sm">
      <div className="card-hard rounded-3xl bg-paper p-6 sm:p-8">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border-2 border-border bg-orange text-white">
          <KeyRound className="h-6 w-6" strokeWidth={2.5} />
        </span>
        <h1 className="mt-4 text-center font-display text-2xl font-extrabold tracking-tight">
          {forced
            ? "Choisissez un nouveau mot de passe"
            : "Changer mon mot de passe"}
        </h1>

        {forced && (
          <p className="card-hard-sm mt-4 rounded-2xl bg-sun p-3 text-center text-sm font-semibold text-ink">
            Votre mot de passe a été réinitialisé par un administrateur. Vous
            devez en choisir un nouveau pour continuer.
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nouveau mot de passe (8 caractères min.)"
            className={field}
          />
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirmer le mot de passe"
            className={field}
          />
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          <button
            disabled={saving}
            className="card-hard-sm w-full rounded-full bg-ink py-3 font-display text-sm font-bold text-cream transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      </div>

      {!forced && (
        <Link
          href="/play/account"
          className="mt-4 block text-center text-sm font-bold text-ink/60 hover:text-orange"
        >
          Annuler
        </Link>
      )}
    </div>
  );
}

export default function PasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-sm space-y-4">
          <HeaderSkeleton />
          <Skeleton className="h-12 w-full" />
        </div>
      }
    >
      <PasswordInner />
    </Suspense>
  );
}
