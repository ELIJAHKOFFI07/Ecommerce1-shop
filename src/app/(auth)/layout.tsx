import { AuthHeader } from "@/components/auth/AuthHeader";
import { SetupNotice } from "@/components/play/SetupNotice";
import { isBackendConfigured } from "@/lib/backend/client";

/// Layout des pages de connexion et d'inscription.
///
/// Volontairement hors du layout /play : aucun header de l'app, aucun footer,
/// juste un en-tête minimal et le formulaire centré verticalement. L'état de
/// connexion n'a pas à être résolu ici — ces pages s'adressent aux visiteurs.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AuthHeader />
      <main className="flex flex-1 flex-col justify-center px-4 pb-10">
        {/* Sans clés backend, les formulaires appelleraient createClient() qui
            lève : on affiche SetupNotice comme dans le layout /play. */}
        {isBackendConfigured() ? children : <SetupNotice />}
      </main>
    </div>
  );
}