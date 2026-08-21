import Link from "next/link";
import { ShoppingBag } from "lucide-react";

/// En-tête dédié aux pages d'authentification (connexion / inscription).
///
/// Volontairement minimaliste : juste le nom de l'app qui ramène à l'accueil.
/// Aucune navigation du site, aucun footer — le lien vers l'autre formulaire
/// vit dans la carte, à portée du formulaire sur mobile.
export function AuthHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8 lg:py-4 2xl:max-w-[1440px]">
        <Link
          href="/"
          className="press flex shrink-0 items-center gap-2 font-display text-xl font-extrabold tracking-tight text-foreground sm:text-2xl"
        >
          <span className="grid h-9 w-9 place-items-center rounded-sm bg-primary sm:h-10 sm:w-10">
            <ShoppingBag className="h-5 w-5 text-primary-foreground" strokeWidth={2.4} />
          </span>
          DreamTeam<span className="text-primary">Shop</span>
        </Link>
      </div>
    </header>
  );
}