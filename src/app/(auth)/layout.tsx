import { AuthHeader } from "@/components/auth/AuthHeader";
import { SetupNotice } from "@/components/play/SetupNotice";
import { isBackendConfigured } from "@/lib/backend/client";

/// Layout des pages de connexion et d'inscription.
///
/// Volontairement hors du layout /play : aucun header de l'app, aucun footer,
/// juste un en-tête minimal et le formulaire centré sur fond clair. Pas de
/// halo ni de fond sombre : l'ambiance reste sobre et minimaliste, le seul
/// accent de couleur vient du tone de chaque page (orange / vert). L'état de
/// connexion n'a pas à être résolu ici — ces pages s'adressent aux visiteurs.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AuthHeader />
      <main className="flex flex-1 flex-col justify-center bg-background px-4 py-6 sm:px-6 lg:px-8">
        {/* Sans clés backend, les formulaires appelleraient createClient() qui
            lève : on affiche SetupNotice comme dans le layout /play. */}
        <div className="mx-auto w-full max-w-6xl">
          {isBackendConfigured() ? children : <SetupNotice />}
        </div>
      </main>
    </div>
  );
}