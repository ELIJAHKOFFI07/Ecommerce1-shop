"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/backend/client";
import { GoogleButton } from "@/components/play/GoogleButton";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [referral, setReferral] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          // Lu par le trigger handle_new_user pour renseigner profiles.
          ...(whatsapp.trim() ? { whatsapp: whatsapp.trim() } : {}),
          ...(referral.trim()
            ? { referral_code_used: referral.trim().toUpperCase() }
            : {}),
        },
      },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-sm py-16 text-center">
        <p className="text-lg font-semibold">Compte créé 🎉</p>
        <p className="mt-2 text-muted">
          Vérifiez votre email pour confirmer, puis connectez-vous.
        </p>
        <Link
          href="/play/login"
          className="mt-6 inline-block rounded-full bg-foreground px-6 py-2.5 font-semibold text-background"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-rise mx-auto max-w-sm py-10">
      <h1 className="text-2xl font-medium tracking-tight">Créer un compte</h1>
      <p className="mt-1 text-sm text-muted">
        Gratuit, et vous gagnez 100 points avec un code de parrainage.
      </p>

      {/* Google en premier : le parcours en un clic évite de remplir cinq
          champs, et le compte est créé automatiquement à la première
          connexion. */}
      <div className="mt-6">
        <GoogleButton label="S'inscrire avec Google" />
      </div>

      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        ou avec un e-mail
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        <input
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Nom d'utilisateur"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
        />
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe (8 caractères min.)"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
        />
        <input
          type="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="Numéro WhatsApp (ex : +225 07 00 00 00 00)"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
        />
        <input
          value={referral}
          onChange={(e) => setReferral(e.target.value)}
          placeholder="Code de parrainage (optionnel)"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 uppercase outline-none focus:border-accent"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={loading}
          className="press w-full rounded-full bg-foreground py-3 font-semibold text-background disabled:opacity-50"
        >
          {loading ? "Création…" : "Créer mon compte"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Déjà inscrit ?{" "}
        <Link href="/play/login" className="text-accent">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
