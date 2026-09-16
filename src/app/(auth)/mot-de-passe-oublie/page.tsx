"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button, Field, Input, Alert } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/forgot-password", { method: "POST", json: { email } });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold">Mot de passe oublié</h1>
      {done ? (
        <div className="mt-8 space-y-6">
          <Alert tone="success">Si un compte existe pour cet e-mail, un lien vient d’être envoyé. Il est valable 30 minutes.</Alert>
          <Link href="/connexion" className="inline-block font-semibold underline underline-offset-4">
            Retour à la connexion
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-muted-foreground">Indiquez votre e-mail : nous vous envoyons un lien pour en choisir un nouveau.</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <Field label="E-mail" htmlFor="email">
              <Input id="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            {error && <Alert tone="error">{error}</Alert>}
            <Button type="submit" size="lg" full disabled={busy}>
              {busy ? "Envoi…" : "Envoyer le lien"}
            </Button>
          </form>
          <p className="mt-8 text-center">
            <Link href="/connexion" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
              Retour à la connexion
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
