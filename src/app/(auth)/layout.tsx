import Link from "next/link";

/// Écrans d'authentification : une colonne centrée, la marque en haut.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-center">
        <Link href="/" className="font-display text-2xl font-bold tracking-tight">
          Superlife<span className="text-accent">Shop</span>
        </Link>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8 sm:py-12">{children}</main>
    </div>
  );
}
