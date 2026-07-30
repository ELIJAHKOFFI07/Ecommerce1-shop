"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/backend/client";
import { GoogleButton } from "@/components/play/GoogleButton";
import { HeaderSkeleton, Skeleton } from "@/components/Skeleton";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // Une erreur renvoyée par /auth/callback (consentement refusé, échange de
  // code impossible) arrive dans l'URL : sans cela l'utilisateur reviendrait
  // sur le formulaire sans savoir ce qui a échoué.
  const [error, setError] = useState<string | null>(
    () => params.get("error"),
  );

  // Un visiteur arrêté au paiement revient à sa commande après connexion,
  // au lieu d'être renvoyé sur son compte et de devoir refaire le chemin.
  // Seuls les chemins internes sont acceptés : une URL absolue permettrait
  // de rediriger vers un site tiers depuis un lien piégé.
  const raw = params.get("next") ?? "";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/play/account";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) setError(error.message);
    else router.push(next);
  }

  const field =
    "w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none transition-colors focus:border-gold";

  return (
    <div className="animate-rise mx-auto max-w-sm py-10">
      <h1 className="text-2xl font-bold">Connexion</h1>
      <p className="mt-1 text-sm text-muted">
        Content de vous revoir sur ElijahShop.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className={field}
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          className={field}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={loading}
          className="press sheen w-full rounded-full bg-gold py-3 font-semibold text-black disabled:opacity-50"
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton label="Se connecter avec Google" redirectTo={next} />

      <p className="mt-6 text-center text-sm text-muted">
        Pas de compte ?{" "}
        <Link href="/play/register" className="underline-grow text-gold">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-sm space-y-4 py-10">
          <HeaderSkeleton />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
