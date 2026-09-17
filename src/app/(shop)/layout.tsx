import { SessionProvider } from "next-auth/react";
import { CartProvider } from "@/lib/cart";
import { Header } from "@/components/Header";
import { BackBar } from "@/components/BackBar";

/// Habillage de la boutique, du panier et de l'espace membre.
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>
        <div className="flex min-h-dvh flex-col">
          <Header />
          <main id="contenu" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 outline-none sm:px-6 lg:py-8">
            <BackBar roots={["/", "/espace"]} />
            {children}
          </main>
          <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground print:hidden">SuperlifeShop · Côte d&apos;Ivoire</footer>
        </div>
      </CartProvider>
    </SessionProvider>
  );
}
