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
      <div className="card-hard rounded-2xl bg-paper p-4">
        <p className="flex items-center gap-2 font-display text-sm font-bold text-ink">
          <BellOff className="h-4 w-4 text-ink/60" strokeWidth={2.5} />
          Notifications push indisponibles
        </p>
        <p className="mt-1 text-xs font-semibold text-ink/60">
          Sur iPhone, ajoutez d&apos;abord le site à votre écran d&apos;accueil
          via le bouton Partager, puis rouvrez-le depuis cette icône.
        </p>
      </div>
    );
  }

  return (
    <div className="card-hard rounded-2xl bg-paper p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-display text-sm font-bold text-ink">
            {subscribed ? (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-border bg-vert-soft text-vert-deep">
                <BellRing className="h-4 w-4" strokeWidth={2.5} />
              </span>
            ) : (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-border bg-orange-soft text-orange">
                <Bell className="h-4 w-4" strokeWidth={2.5} />
              </span>
            )}
            Notifications push
          </p>
          <p className="mt-1 text-xs font-semibold text-ink/60">
            Commandes, offres, enchères et messages, même application fermée.
          </p>
        </div>

        <button
          onClick={toggle}
          disabled={busy || state === "denied"}
          className={`card-hard-sm shrink-0 rounded-full px-4 py-2 font-display text-xs font-bold transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 ${
            subscribed
              ? "bg-paper text-ink hover:text-red-600"
              : "bg-ink text-cream"
          }`}
        >
          {busy ? "…" : subscribed ? "Désactiver" : "Activer"}
        </button>
      </div>

      {state === "denied" && (
        <p className="mt-3 text-xs font-semibold text-ink/60">
          Vous avez refusé les notifications pour ce site. Le navigateur ne
          repose plus la question : réautorisez-les depuis l&apos;icône à
          gauche de la barre d&apos;adresse.
        </p>
      )}

      {message && <p className="mt-3 text-xs font-semibold text-vert-deep">{message}</p>}
    </div>
  );
}

const REASONS: Partial<Record<string, string>> = {
  denied: "Autorisation refusée. Réactivez-la depuis les réglages du navigateur.",
  default: "Autorisation non accordée.",
  unsupported: "Votre navigateur ne prend pas en charge les notifications push.",
  unconfigured: "Notifications push non configurées sur ce site.",
};
