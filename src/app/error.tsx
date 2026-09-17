"use client";

import { useEffect } from "react";

/// Écran d'erreur générique. Sans lui, une base injoignable donne une page
/// blanche : le client croit que « rien ne s'affiche ». Ici on dit ce qui
/// se passe, sans détail technique (le détail part en console serveur).
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-2xl font-bold">
        Superlife<span className="text-accent">Shop</span>
      </p>
      <h1 className="font-display mt-8 text-4xl font-semibold">Un problème est survenu</h1>
      <p className="mt-3 text-muted-foreground">Le service est momentanément indisponible. Réessayez dans un instant.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted-foreground">Réf. {error.digest}</p>}
      <button type="button" onClick={reset} className="press mt-8 h-12 cursor-pointer rounded-md bg-primary px-6 font-semibold text-primary-foreground hover:bg-secondary">
        Réessayer
      </button>
    </div>
  );
}
