import { CartProvider } from "@/lib/cart";
import { SessionProvider } from "@/lib/session";
import { AnnouncementBanner } from "@/components/play/AnnouncementBanner";
import { AuthGate } from "@/components/play/AuthGate";
import { PasswordChangeGate } from "@/components/play/PasswordChangeGate";
import { PlayNav } from "@/components/play/PlayNav";
import { SetupNotice } from "@/components/play/SetupNotice";
import { LandingHeader } from "@/components/marketing/LandingHeader";
import { LandingFooter } from "@/components/marketing/LandingFooter";
import { isBackendConfigured } from "@/lib/backend/client";
import { createClient } from "@/lib/backend/server";

const CONTAINER =
  "mx-auto w-full max-w-7xl px-4 pt-4 md:px-6 lg:pt-8 2xl:max-w-[1440px]";

export default async function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sans clés backend, on n'instancie pas SessionProvider : il appellerait
  // createClient() qui lève, et l'écran de configuration ne s'afficherait pas.
  if (!isBackendConfigured()) {
    return (
      <div className={`${CONTAINER} pb-10`}>
        <SetupNotice />
      </div>
    );
  }

  // L'état de connexion est résolu ici, côté serveur : le déduire côté
  // navigateur ferait apparaître la navigation membre puis la remplacerait
  // par celle du visiteur, ou l'inverse.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const connected = Boolean(user);

  return (
    <SessionProvider>
      <CartProvider>
        <AuthGate connected={connected} />

        {connected ? (
          <>
            <PasswordChangeGate />
            <PlayNav />
            {/* pb-24 : réserve la hauteur de la barre du bas, qui n'existe
                que pour les membres. */}
            <div className={`${CONTAINER} pb-24 md:pb-10`}>
              <AnnouncementBanner />
              {children}
            </div>
          </>
        ) : (
          // Un visiteur garde l'habillage de la vitrine : il navigue dans le
          // catalogue sans jamais basculer dans l'interface membre.
          <div className="flex min-h-screen flex-col">
            <LandingHeader connected={false} />
            <div className={`${CONTAINER} flex-1 pb-14`}>
              <AnnouncementBanner />
              {children}
            </div>
            <LandingFooter />
          </div>
        )}
      </CartProvider>
    </SessionProvider>
  );
}
