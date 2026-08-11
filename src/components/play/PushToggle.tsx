"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import {
  disablePush,
  enablePush,
  getPushState,
  type PushState,
} from "@/lib/push";
import { useSession } from "@/lib/session";

/// Réglage d'abonnement aux notifications push.
///
/// La demande d'autorisation part d'un clic explicite : posée au chargement,
/// elle est refusée par la plupart des visiteurs — et un refus est définitif,
/// le navigateur ne repose plus la question.
export function PushToggle() {
  const { profile, refresh } = useSession();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPushState().then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // L'autorisation du navigateur ne suffit pas : le jeton doit aussi être
  // enregistré. Un compte peut avoir autorisé puis s'être désabonné.
  const subscribed = state === "granted" && Boolean(profile?.fcm_token);

  async function toggle() {
    setBusy(true);
    setMessage(null);

    if (subscribed) {
      const ok = await disablePush();
      setMessage(ok ? "Notifications désactivées." : "Opération impossible.");
    } else {
      const result = await enablePush();
      if (result.ok) {
        setMessage("Notifications activées.");
        setState("granted");
      } else {
        setMessage(REASONS[result.reason] ?? result.message ?? "Erreur.");
        if (result.reason === "denied") setState("denied");
      }
    }

    await refresh();
    setBusy(false);
  }

  // Tant que l'état n'est pas connu, on n'affiche rien : un bouton qui
  // change de libellé juste après l'affichage donne l'impression d'un bug.
  if (state === null) return null;

  if (state === "unconfigured") return null;

  if (state === "unsupported") {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <BellOff className="h-4 w-4 text-muted" />
          Notifications push indisponibles
        </p>
        <p className="mt-1 text-xs text-muted">
          Sur iPhone, ajoutez d&apos;abord le site à votre écran d&apos;accueil
          via le bouton Partager, puis rouvrez-le depuis cette icône.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            {subscribed ? (
              <BellRing className="h-4 w-4 text-accent" />
            ) : (
              <Bell className="h-4 w-4 text-muted" />
            )}
            Notifications push
          </p>
          <p className="mt-1 text-xs text-muted">
            Commandes, offres, enchères et messages, même application fermée.
          </p>
        </div>

        <button
          onClick={toggle}
          disabled={busy || state === "denied"}
          className={`press shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
            subscribed
              ? "border border-border hover:border-red-500 hover:text-red-400"
              : "bg-foreground text-background"
          }`}
        >
          {busy ? "…" : subscribed ? "Désactiver" : "Activer"}
        </button>
      </div>

      {state === "denied" && (
        <p className="mt-3 text-xs text-muted">
          Vous avez refusé les notifications pour ce site. Le navigateur ne
          repose plus la question : réautorisez-les depuis l&apos;icône à
          gauche de la barre d&apos;adresse.
        </p>
      )}

      {message && <p className="mt-3 text-xs text-accent">{message}</p>}
    </div>
  );
}

const REASONS: Partial<Record<string, string>> = {
  denied: "Autorisation refusée. Réactivez-la depuis les réglages du navigateur.",
  default: "Autorisation non accordée.",
  unsupported: "Votre navigateur ne prend pas en charge les notifications push.",
  unconfigured: "Notifications push non configurées sur ce site.",
};
