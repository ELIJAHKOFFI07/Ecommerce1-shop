import { Brand } from "@/components/Brand";
import { BackBar } from "@/components/BackBar";

/// Écrans d'authentification : une colonne centrée, la marque en haut.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-center">
        <Brand />
      </header>
      <main id="contenu" tabIndex={-1} className="mx-auto w-full max-w-md flex-1 px-4 py-6 outline-none sm:py-10">
        <BackBar roots={[]} />
        {children}
      </main>
    </div>
  );
}
