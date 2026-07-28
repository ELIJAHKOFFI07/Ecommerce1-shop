import { AlertTriangle } from "lucide-react";

/// Affiché à la place des pages /play quand Supabase n'est pas configuré :
/// sans cela, chaque page resterait bloquée sur "Chargement…" (createClient
/// lève dans un effet async non intercepté).
export function SetupNotice() {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <AlertTriangle className="mx-auto h-10 w-10 text-gold" />
      <h1 className="mt-4 text-xl font-bold">Supabase n&apos;est pas configuré</h1>
      <p className="mt-2 text-sm text-muted">
        L&apos;app a besoin d&apos;un projet Supabase pour charger les produits,
        les comptes et les commandes.
      </p>
      <ol className="mt-6 space-y-2 text-left text-sm text-muted">
        <li>
          1. Copiez <code className="text-gold">.env.example</code> en{" "}
          <code className="text-gold">.env.local</code>.
        </li>
        <li>
          2. Renseignez{" "}
          <code className="text-gold">NEXT_PUBLIC_SUPABASE_URL</code> et{" "}
          <code className="text-gold">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </li>
        <li>3. Relancez le serveur de développement.</li>
      </ol>
      <p className="mt-6 text-xs text-muted">
        La vitrine publique (<code className="text-gold">/</code>) fonctionne sans
        cette configuration.
      </p>
    </div>
  );
}
