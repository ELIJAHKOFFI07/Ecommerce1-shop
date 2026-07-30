import Link from "next/link";
import { LogIn, Search, ShoppingBag, Sparkles } from "lucide-react";

/// En-tête de la page d'accueil publique.
///
/// L'état de connexion est résolu côté serveur : afficher « Se connecter »
/// puis basculer sur « Mon compte » après hydratation produirait exactement
/// le clignotement que l'on corrige ailleurs.
export function LandingHeader({ connected }: { connected: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:py-4 2xl:max-w-[1440px]">
        <Link
          href="/"
          className="press flex shrink-0 items-center gap-2 text-lg font-bold text-gold lg:text-xl"
        >
          <Sparkles className="h-5 w-5" />
          DreamTeamShop
        </Link>

        <Link
          href="/play/search"
          className="press group ml-auto flex min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-surface/70 px-4 py-2 text-sm text-muted transition-colors hover:border-gold/60 sm:max-w-md"
        >
          <Search className="h-4 w-4 shrink-0 transition-colors group-hover:text-gold" />
          <span className="truncate">Rechercher un produit…</span>
        </Link>

        <nav className="flex shrink-0 items-center gap-2">
          <Link
            href="/play"
            className="press hidden rounded-full px-3 py-2 text-sm text-muted transition-colors hover:text-foreground sm:inline-flex sm:items-center sm:gap-1.5"
          >
            <ShoppingBag className="h-4 w-4" />
            Boutique
          </Link>

          {connected ? (
            <Link
              href="/play/account"
              className="press sheen rounded-full bg-gold px-4 py-2 text-sm font-semibold text-black"
            >
              Mon compte
            </Link>
          ) : (
            <>
              <Link
                href="/play/login"
                className="press inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-sm transition-colors hover:border-gold hover:text-gold"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden xs:inline">Se connecter</span>
                <span className="xs:hidden">Connexion</span>
              </Link>
              <Link
                href="/play/register"
                className="press sheen hidden rounded-full bg-gold px-4 py-2 text-sm font-semibold text-black sm:inline-block"
              >
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
