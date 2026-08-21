import { CartProvider } from "@/lib/cart";
import { SessionProvider } from "@/lib/session";
import { AnnouncementBar } from "@/components/landing/AnnouncementBar";
import { Navbar } from "@/components/landing/Navbar";
import { LandingFooter } from "@/components/marketing/LandingFooter";
import { AnnouncementBanner } from "@/components/play/AnnouncementBanner";
import { AuthGate } from "@/components/play/AuthGate";
import { PasswordChangeGate } from "@/components/play/PasswordChangeGate";
import { SetupNotice } from "@/components/play/SetupNotice";
import { isBackendConfigured } from "@/lib/backend/client";
import { createClient } from "@/lib/backend/server";

const CONTAINER =
  "mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:py-10 2xl:max-w-[1440px]";

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
        {/* Tout /play partage l'habillage de la vitrine : bandeau défilant +
            barre de navigation (logo, recherche, catégories). */}
 <div className="flex min-h-screen flex-col bg-background text-foreground">
          <AnnouncementBar />
          <Navbar />
 <main className="flex-1">
            {connected && <PasswordChangeGate />}
 <div className={CONTAINER}>
              <AnnouncementBanner />
              {children}
            </div>
          </main>
          {!connected && <LandingFooter />}
        </div>
      </CartProvider>
    </SessionProvider>
  );
}