import Link from "next/link";
import Image from "next/image";

/// Écrans d'authentification : une colonne centrée, la marque en haut.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-center">
        <Link href="/" aria-label="SuperlifeShop — accueil">
          <Image src="/logo-wide.png" alt="SuperLife Côte d’Ivoire" width={658} height={120} priority className="h-11 w-auto" />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8 sm:py-12">{children}</main>
    </div>
  );
}
