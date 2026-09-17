"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button, Field, Input, Alert } from "@/components/ui";
import { PasswordInput } from "@/components/PasswordInput";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <Alert tone="error">
        Lien incomplet. <Link href="/mot-de-passe-oublie" className="underline">Refaire une demande</Link>.
      </Alert>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError("Les deux mots de passe ne correspondent pas.");
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/reset-password", { method: "POST", json: { token, password } });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold">Nouveau mot de passe</h1>
      {done ? (
        <div className="mt-8 space-y-6">
          <Alert tone="success">Mot de passe modifié.</Alert>
          <Link href="/connexion" className="press inline-flex h-12 items-center rounded-md bg-primary px-5 font-semibold text-primary-foreground">
            Se connecter
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-5">
          <Field label="Nouveau mot de passe" htmlFor="password" hint="10 caractères minimum, avec des lettres et des chiffres.">
            <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} maxLength={128} />
          </Field>
          <Field label="Confirmer" htmlFor="confirm">
            <PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </Field>
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" size="lg" full disabled={busy}>
            {busy ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      )}
    </div>
  );
}
