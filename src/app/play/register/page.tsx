"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
          className="mt-6 inline-block rounded-full bg-gold px-6 py-2.5 font-semibold text-black"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="mb-6 text-2xl font-bold">Créer un compte</h1>
      <form onSubmit={submit} className="space-y-4">
        <input
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Nom d'utilisateur"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
        />
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe (8 caractères min.)"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
        />
        <input
          value={referral}
          onChange={(e) => setReferral(e.target.value)}
          placeholder="Code de parrainage (optionnel)"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 uppercase outline-none focus:border-gold"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-full bg-gold py-3 font-semibold text-black disabled:opacity-50"
        >
          {loading ? "Création…" : "Créer mon compte"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Déjà inscrit ?{" "}
        <Link href="/play/login" className="text-gold">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
