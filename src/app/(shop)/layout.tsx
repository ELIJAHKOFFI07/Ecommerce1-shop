import { SessionProvider } from "next-auth/react";
import { CartProvider } from "@/lib/cart";
import { Header } from "@/components/Header";

/// Habillage de la boutique, du panier et de l'espace membre.
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>
        <div className="flex min-h-dvh flex-col">
          <Header />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-12">{children}</main>
          <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground print:hidden">SuperlifeShop · Côte d&apos;Ivoire</footer>
        </div>
      </CartProvider>
    </SessionProvider>
  );
}
