import type { ReactNode } from "react";
import Link from "next/link";

/// Layout mono-colonne centré des pages d'authentification.
///
/// Plus d'image ni de grille split : le formulaire seul, centré et bien
/// dimensionné (max-w-md), sur fond clair. Le `tone` teinte le seul accent de
/// couleur de la page — `primary` (orange) pour l'inscription, `secondary`
/// (vert) pour la connexion — c'est la seule différence structurelle entre
/// les deux formulaires. L'ambiance reste sobre et minimaliste : pas de
/// bordure dure, pas d'ombre, arrondis limités à rounded-sm.
export type AuthTone = "primary" | "secondary";

/// Champs de formulaire dans le style néo-brutal du site : bordure encre 2px
/// + ombre dure. Au focus, la bordure et l'ombre prennent la couleur du tone
/// pour indiquer le champ actif sans dépendre du seul `outline`.
export const authFieldPrimary =
  "w-full rounded-sm bg-surface px-3.5 py-2.5 font-medium text-foreground placeholder:text-muted/70 outline-none transition-all focus:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none";

export const authFieldSecondary =
  "w-full rounded-sm bg-surface px-3.5 py-2.5 font-medium text-foreground placeholder:text-muted/70 outline-none transition-all focus:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none";

/// Bouton de soumission : aplat dans la couleur du tone, l'ombre dure reprend
/// cette couleur au survol pendant que le bouton s'enfonce (comme les CTA de
/// l'accueil public).
export const authSubmitPrimary =
  "press w-full rounded-sm bg-primary px-6 py-3 font-display text-base font-bold text-primary-foreground transition-all hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50";

export const authSubmitSecondary =
  "press w-full rounded-sm bg-secondary px-6 py-3 font-display text-base font-bold text-secondary-foreground transition-all hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50";

export function AuthSplit({
  tone,
  kicker,
  title,
  subtitle,
  children,
}: {
  tone: AuthTone;
  kicker: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const accent = tone === "primary" ? "text-primary" : "text-secondary";

  /// Lien de bascule : sous le formulaire, centré, pour rester à portée sur
  /// mobile. La couleur annonce la page de destination — orange pour
  /// l'inscription, vert pour la connexion.
  const isRegister = tone === "primary";
  const switchHref = isRegister ? "/play/login" : "/play/register";
  const switchLabel = isRegister
    ? "Déjà inscrit ? Se connecter"
    : "Pas de compte ? Inscrivez-vous";
  const switchClass = isRegister ? "text-secondary" : "text-primary";

  return (
    <div className="animate-rise mx-auto w-full max-w-md px-6  sm:px-8">
      <span className="inline-flex w-fit items-center gap-2 rounded-sm bg-card px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
        <span className={`h-2 w-2 rounded-sm ${accent}`} aria-hidden />
        {kicker}
      </span>
      <h1 className="font-display mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 text-muted">{subtitle}</p>
      <div className="mt-5">{children}</div>

      <div className="mt-5 text-center">
        <Link
          href={switchHref}
          className={`press underline-grow text-sm font-semibold ${switchClass}`}
        >
          {switchLabel}
        </Link>
      </div>
    </div>
  );
}
