import { CartProvider } from "@/lib/cart";
import { SessionProvider } from "@/lib/session";
import { AnnouncementBanner } from "@/components/play/AnnouncementBanner";
import { PasswordChangeGate } from "@/components/play/PasswordChangeGate";
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
      <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-4 md:px-6 md:pb-10 2xl:max-w-[1440px]">
        <SetupNotice />
      </div>
    );
  }

  return (
    <SessionProvider>
      <CartProvider>
        <PasswordChangeGate />
        <PlayNav />
        <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-4 md:px-6 md:pb-10 2xl:max-w-[1440px]">
          <AnnouncementBanner />
          {children}
        </div>
      </CartProvider>
    </SessionProvider>
  );
}
