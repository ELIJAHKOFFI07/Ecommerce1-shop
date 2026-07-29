import { CartProvider } from "@/lib/cart";
import { SessionProvider } from "@/lib/session";
import { AnnouncementBanner } from "@/components/play/AnnouncementBanner";
import { PlayNav } from "@/components/play/PlayNav";
import { SetupNotice } from "@/components/play/SetupNotice";
import { isBackendConfigured } from "@/lib/backend/client";

export default function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sans clés backend, on n'instancie pas SessionProvider : il appellerait
  // createClient() qui lève, et l'écran de configuration ne s'afficherait pas.
  if (!isBackendConfigured()) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-4">
        <SetupNotice />
      </div>
    );
  }

  return (
    <SessionProvider>
      <CartProvider>
        <PlayNav />
        {/* md:pl-56 : réserve la largeur de la barre latérale fixe, qui a
            son propre espace de positionnement (fixed) et ne pousse pas le
            flux normal. Le mx-auto max-w-6xl interne recentre le contenu
            dans l'espace restant. */}
        <div className="w-full md:pl-56">
          <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-4">
            <AnnouncementBanner />
            {children}
          </div>
        </div>
      </CartProvider>
    </SessionProvider>
  );
}
