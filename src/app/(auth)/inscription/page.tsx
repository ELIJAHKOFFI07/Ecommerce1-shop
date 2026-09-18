"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { api } from "@/lib/api";
import { Button, Field, Input, Alert } from "@/components/ui";
import { PasswordInput } from "@/components/PasswordInput";

/// Inscription en un seul écran. Après succès, connexion automatique.
export default function RegisterPage() {
  const [f, setF] = useState({ name: "", phone: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/register", { method: "POST", json: { ...f, phone: f.phone || undefined } });
      const res = await signIn("credentials", { email: f.email, password: f.password, redirect: false });
      window.location.assign(res?.error ? "/connexion" : "/compte?bienvenue=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold">Créer un compte</h1>
      <p className="mt-2 text-muted-foreground">Une minute, et vous pourrez commander.</p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <Field label="Nom complet" htmlFor="name">
          <Input id="name" autoComplete="name" value={f.name} onChange={set("name")} required maxLength={120} />
        </Field>
        <Field label="Téléphone (facultatif)" htmlFor="phone">
          <Input id="phone" type="tel" autoComplete="tel" inputMode="tel" value={f.phone} onChange={set("phone")} placeholder="+225 07 00 00 00 00" />
        </Field>
        <Field label="E-mail" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" inputMode="email" value={f.email} onChange={set("email")} required />
        </Field>
        <Field label="Mot de passe" htmlFor="password" hint="10 caractères minimum, avec des lettres et des chiffres.">
          <PasswordInput id="password" autoComplete="new-password" value={f.password} onChange={set("password")} required minLength={10} maxLength={128} />
        </Field>
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" size="lg" full disabled={busy} loading={busy}>
          {busy ? "Création…" : "Créer mon compte"}
        </Button>
      </form>

      <p className="mt-10 text-center text-muted-foreground">
        Déjà membre ?{" "}
        <Link href="/connexion" className="font-semibold text-foreground underline underline-offset-4">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
