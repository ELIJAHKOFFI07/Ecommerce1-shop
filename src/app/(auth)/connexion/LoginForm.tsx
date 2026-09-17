"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button, Field, Input, Alert } from "@/components/ui";
import { PasswordInput } from "@/components/PasswordInput";

/// Messages d'erreur volontairement peu précis côté identifiants
/// (« e-mail ou mot de passe incorrect ») : on ne dit jamais lequel.
const ERRORS: Record<string, string> = {
  invalid: "E-mail ou mot de passe incorrect.",
  locked: "Trop d’échecs : ce compte est temporairement verrouillé. Réessayez plus tard ou réinitialisez votre mot de passe.",
  blocked: "Ce compte est bloqué. Contactez l’administration.",
  ratelimited: "Trop de tentatives. Patientez quelques minutes.",
  google_unknown: "Aucun compte SuperlifeShop n’est associé à cette adresse Google. Inscrivez-vous d’abord.",
  CredentialsSignin: "E-mail ou mot de passe incorrect.",
};

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const params = useSearchParams();
  const next = params.get("suite") || "/espace";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    const e = params.get("error");
    return e ? ERRORS[e] ?? "Connexion impossible. Réessayez." : null;
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError(ERRORS[res.code ?? ""] ?? ERRORS[res.error] ?? "Connexion impossible. Réessayez.");
      setBusy(false);
      return;
    }
    // Rechargement complet : le proxy et l'en-tête lisent la session serveur.
    window.location.assign(next.startsWith("/") ? next : "/espace");
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold">Connexion</h1>
      <p className="mt-2 text-muted-foreground">Accédez à votre espace membre.</p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <Field label="E-mail" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Mot de passe" htmlFor="password">
          <PasswordInput id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" size="lg" full disabled={busy} loading={busy}>
          {busy ? "Connexion…" : "Se connecter"}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <Link href="/mot-de-passe-oublie" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          Mot de passe oublié ?
        </Link>
      </div>

      {googleEnabled && (
        <>
          <div className="my-7 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="secondary" size="lg" full onClick={() => signIn("google", { callbackUrl: next })}>
            <GoogleMark /> Continuer avec Google
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">Réservé aux membres déjà inscrits avec cette adresse.</p>
        </>
      )}

      <p className="mt-10 text-center text-muted-foreground">
        Pas encore membre ?{" "}
        <Link href="/inscription" className="font-semibold text-foreground underline underline-offset-4">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.4 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.7l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.2 0 11.6-2 15.4-5.6l-7.5-5.8c-2.1 1.4-4.8 2.2-7.9 2.2-6.3 0-11.7-4.1-13.6-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
