import { CartProvider } from "@/lib/cart";
import { PlayNav } from "@/components/play/PlayNav";
import { SetupNotice } from "@/components/play/SetupNotice";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <PlayNav />
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:pb-10">
        {isSupabaseConfigured() ? children : <SetupNotice />}
      </div>
    </CartProvider>
  );
}
