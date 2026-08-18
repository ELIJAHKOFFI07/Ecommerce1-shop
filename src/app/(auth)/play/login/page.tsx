"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/backend/client";
import { GoogleButton } from "@/components/play/GoogleButton";
import { HeaderSkeleton, Skeleton } from "@/components/Skeleton";
import {
  AuthSplit,
  AUTH_IMAGES,
  authFieldSecondary,
  authSubmitSecondary,
} from "@/components/auth/AuthSplit";

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

  return (
    <AuthSplit
      tone="secondary"
      image={AUTH_IMAGES.login}
      imageAlt="Ambiance shopping chaleureuse DreamTeamShop"
      kicker="Bienvenue de retour"
      title="Connexion"
      subtitle="Content de vous revoir sur DreamTeamShop."
      badge="Content de vous revoir"
      featureTitle="Votre panier vous attend"
      featureText="Retrouvez vos achats, négociations et vendeurs favoris en un clic."
    >
      <div className="stagger space-y-4">
        <GoogleButton
          label="Se connecter avec Google"
          redirectTo={next}
          tone="secondary"
        />

        <div className="my-2 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" />
          ou
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="stagger space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className={authFieldSecondary}
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className={authFieldSecondary}
          />
          {error && <p className="text-sm font-medium text-red-400">{error}</p>}
          <button disabled={loading} className={authSubmitSecondary}>
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </AuthSplit>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-md space-y-4 py-10">
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
