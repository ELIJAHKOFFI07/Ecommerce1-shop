"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/// En-tête des pages secondaires, avec retour en arrière.
///
/// Ces pages (roue, parrainage, portefeuille, offres…) ne figurent pas dans
/// la barre du bas : sans ce bouton, le seul moyen d'en sortir sur téléphone
/// était le geste de retour du système, invisible pour beaucoup.
///
/// Le retour utilise l'historique du navigateur, avec une destination de
/// repli : on peut arriver ici par un lien externe ou une notification, et
/// `router.back()` sortirait alors du site.
export function PageHeader({
  title,
  subtitle,
  fallbackHref = "/play/account",
  action,
}: {
  title: string;
  subtitle?: string;
  fallbackHref?: string;
  action?: React.ReactNode;
}) {
  const router = useRouter();

  function goBack() {
    // `history.length <= 1` : cet onglet n'a pas d'historique propre, un
    // retour arrière quitterait le site.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <button
          onClick={goBack}
          aria-label="Retour"
          className="card-hard-sm mt-0.5 shrink-0 rounded-full bg-card p-2.5 text-foreground transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
        </button>

        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold tracking-tight lg:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm font-semibold text-foreground/60 lg:text-base">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
