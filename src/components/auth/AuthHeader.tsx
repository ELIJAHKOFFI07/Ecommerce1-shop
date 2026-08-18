"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

/// En-tête dédié aux pages d'authentification (connexion / inscription).
///
/// Volontairement minimaliste : le nom de l'app à gauche, un seul lien à
/// droite qui bascule vers l'autre formulaire. Aucune navigation du site,
/// aucun footer — le contexte de l'app n'a pas de place ici. Le lien reprend
/// le tone de la page courante (primary = inscription, secondary = connexion)
/// pour que les deux formulaires se distinguent au premier coup d'œil.
export function AuthHeader() {
  const pathname = usePathname();
  const isRegister = pathname === "/play/register";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8 lg:py-4 2xl:max-w-[1440px]">
        <Link
          href="/"
          className="press flex shrink-0 items-center gap-2 text-lg font-medium tracking-tight text-foreground lg:text-xl"
        >
          <Sparkles className="h-5 w-5" />
          DreamTeamShop
        </Link>

        <Link
          href={isRegister ? "/play/login" : "/play/register"}
          className={`press shrink-0 rounded-full border-2 px-4 py-2 text-sm font-semibold transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_0_var(--foreground)] ${
            isRegister
              ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
              : "border-secondary bg-secondary/10 text-secondary hover:bg-secondary/20"
          }`}
        >
          {isRegister
            ? "Déjà inscrit ? Se connecter"
            : "Pas de compte ? Inscrivez-vous"}
        </Link>
      </div>
    </header>
  );
}