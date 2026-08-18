import type { ReactNode } from "react";
import { Star } from "lucide-react";

/// Layout à deux colonnes des pages d'authentification.
///
/// Formulaire à gauche, image chaleureuse à droite. Le `tone` teinte tout
/// l'accent de la page : `primary` (orange) pour l'inscription, `secondary`
/// (vert) pour la connexion — c'est la seule différence structurelle entre
/// les deux formulaires. Sur mobile l'image est masquée : le formulaire reste
/// le seul contenu, la chaleur passe par les blobs du layout et le badge.
export type AuthTone = "primary" | "secondary";

/// Images libres Unsplash (licence gratuite, aucune attribution requise).
/// Chargées en `object-cover` : elles remplissent la colonne droite quelle
/// que soit sa hauteur, en portrait pour ne rien perdre du cadrage.
export const AUTH_IMAGES = {
  login:
    "https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=1400&h=1800&auto=format&fit=crop",
  register:
    "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1400&h=1800&auto=format&fit=crop",
} as const;

/// Champs de formulaire dans le style néo-brutal du site : bordure encre 2px
/// + ombre dure. Au focus, la bordure et l'ombre prennent la couleur du tone
/// pour indiquer le champ actif sans dépendre du seul `outline`.
export const authFieldPrimary =
  "card-hard-sm w-full rounded-xl bg-surface px-4 py-3 font-medium text-foreground placeholder:text-muted/70 outline-none transition-all focus:border-primary focus:shadow-[4px_4px_0_0_var(--primary)]";

export const authFieldSecondary =
  "card-hard-sm w-full rounded-xl bg-surface px-4 py-3 font-medium text-foreground placeholder:text-muted/70 outline-none transition-all focus:border-secondary focus:shadow-[4px_4px_0_0_var(--secondary)]";

/// Bouton de soumission : aplat dans la couleur du tone, l'ombre dure reprend
/// cette couleur au survol pendant que le bouton s'enfonce (comme les CTA de
/// l'accueil public).
export const authSubmitPrimary =
  "press card-hard w-full rounded-full bg-primary px-6 py-3.5 font-display text-base font-bold text-primary-foreground transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--primary)] disabled:cursor-not-allowed disabled:opacity-50";

export const authSubmitSecondary =
  "press card-hard w-full rounded-full bg-secondary px-6 py-3.5 font-display text-base font-bold text-secondary-foreground transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--secondary)] disabled:cursor-not-allowed disabled:opacity-50";

export function AuthSplit({
  tone,
  image,
  imageAlt,
  kicker,
  title,
  subtitle,
  badge,
  featureTitle,
  featureText,
  children,
}: {
  tone: AuthTone;
  image: string;
  imageAlt: string;
  kicker: string;
  title: string;
  subtitle: string;
  badge: string;
  featureTitle: string;
  featureText: string;
  children: ReactNode;
}) {
  const accent = tone === "primary" ? "text-primary" : "text-secondary";

  return (
    <div className="animate-rise mx-auto w-full max-w-7xl">
      <div className="card-hard grid overflow-hidden rounded-blob bg-surface lg:grid-cols-[1fr_1.15fr] lg:min-h-[calc(100dvh-8rem)]">
        {/* Colonne formulaire : centrée verticalement, largeur lisible. */}
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
          <div className="w-full max-w-md">
            <span className="card-hard-sm inline-flex w-fit items-center gap-2 rounded-full bg-paper px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
              <span className={`h-2 w-2 rounded-full ${accent}`} aria-hidden />
              {kicker}
            </span>
            <h1 className="font-display mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-muted">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>

        {/* Colonne image : décorative, absente sur mobile. L'aplat de texte
            pose du contraste sous les cartes flottantes pour rester lisible
            sur n'importe quelle photo. */}
        <div className="relative hidden overflow-hidden lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={imageAlt}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />

          <div className="card-hard-sm animate-float absolute left-6 top-6 flex items-center gap-2 rounded-full bg-paper px-4 py-2 text-sm font-bold text-foreground">
            {badge}
          </div>

          <div className="card-hard absolute bottom-8 left-8 w-64 rounded-2xl bg-paper p-5">
            <div className={`flex items-center gap-0.5 ${accent}`} aria-hidden>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <p className="font-display mt-3 text-lg font-bold leading-snug text-foreground">
              {featureTitle}
            </p>
            <p className="mt-1 text-sm text-muted">{featureText}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
