import { CartProvider } from "@/lib/cart";
import { SessionProvider } from "@/lib/session";
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
      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4 md:pb-10">
        <SetupNotice />
      </div>
    );
  }

  return (
    <SessionProvider>
      <CartProvider>
        <PlayNav />
        <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4 md:pb-10">
          {children}
        </div>
      </CartProvider>
    </SessionProvider>
  );
}
