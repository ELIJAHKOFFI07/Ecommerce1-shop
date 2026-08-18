import { AuthHeader } from "@/components/auth/AuthHeader";
import { SetupNotice } from "@/components/play/SetupNotice";
import { isBackendConfigured } from "@/lib/backend/client";

/// Layout des pages de connexion et d'inscription.
///
/// Volontairement hors du layout /play : aucun header de l'app, aucun footer,
/// juste un en-tête minimal et la carte à deux colonnes centrée. Deux halos
/// en fond (orange et vert) rappellent discrètement les deux tones des pages
/// — ils reprennent les tokens, aucun hex en dur. L'état de connexion n'a pas
/// à être résolu ici — ces pages s'adressent aux visiteurs.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AuthHeader />
      <main className="relative flex flex-1 flex-col justify-center bg-auth-bg px-4 py-6 sm:px-6 lg:px-8">
        <div
          aria-hidden
          className="animate-drift pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-primary/10 blur-[110px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-28 bottom-10 h-72 w-72 rounded-full bg-secondary/10 blur-[110px]"
        />
        {/* Sans clés backend, les formulaires appelleraient createClient() qui
            lève : on affiche SetupNotice comme dans le layout /play. */}
        <div className="mx-auto w-full max-w-6xl">
          {isBackendConfigured() ? children : <SetupNotice />}
        </div>
      </main>
    </div>
  );
}