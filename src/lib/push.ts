"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { createClient } from "@/lib/backend/client";

/// Notifications push (Firebase Cloud Messaging).
///
/// Le jeton obtenu est enregistré dans `profiles.fcm_token`, colonne déjà
/// accessible en écriture au client (voir le `grant update` de schema.sql).
/// L'envoi, lui, se fait côté serveur avec le compte de service.

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isPushConfigured(): boolean {
  return Boolean(
    config.apiKey &&
      config.projectId &&
      config.messagingSenderId &&
      config.appId &&
      process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  );
}

function app(): FirebaseApp {
  return getApps()[0] ?? initializeApp(config);
}

export type PushState =
  | "unsupported" // navigateur incapable (iOS hors écran d'accueil, mode privé…)
  | "unconfigured" // clés Firebase absentes
  | "denied" // refus explicite, non redemandable
  | "granted" // autorisé et jeton enregistré
  | "default"; // jamais demandé

/// État courant, sans rien demander à l'utilisateur.
export async function getPushState(): Promise<PushState> {
  if (!isPushConfigured()) return "unconfigured";
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window) || !(await isSupported())) {
    return "unsupported";
  }
  const permission = Notification.permission;
  if (permission === "granted") return "granted";
  if (permission === "denied") return "denied";
  return "default";
}

/// Demande l'autorisation puis enregistre le jeton.
///
/// À n'appeler qu'en réponse à une action explicite : une demande déclenchée
/// au chargement est refusée par une large majorité des visiteurs, et un
/// refus est définitif — le navigateur ne repose plus la question.
export async function enablePush(): Promise<
  { ok: true } | { ok: false; reason: PushState | "error"; message?: string }
> {
  const state = await getPushState();
  if (state === "unsupported" || state === "unconfigured" || state === "denied") {
    return { ok: false, reason: state };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, reason: permission === "denied" ? "denied" : "default" };
    }

    // Le service worker est enregistré explicitement : sans cela le SDK
    // cherche `/firebase-messaging-sw.js` avec une portée par défaut qui ne
    // couvre pas toujours l'application.
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/" },
    );

    const token = await getToken(getMessaging(app()), {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) return { ok: false, reason: "error", message: "Jeton vide." };

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return { ok: false, reason: "error", message: "Session expirée." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ fcm_token: token })
      .eq("id", userData.user.id);
    if (error) return { ok: false, reason: "error", message: error.message };

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: "error",
      message: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

/// Désinscription : on efface le jeton côté base.
///
/// L'autorisation du navigateur, elle, ne peut pas être retirée par le site —
/// seul l'utilisateur peut le faire dans les réglages. Effacer le jeton
/// suffit à ne plus rien envoyer.
export async function disablePush(): Promise<boolean> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;
  const { error } = await supabase
    .from("profiles")
    .update({ fcm_token: null })
    .eq("id", userData.user.id);
  return !error;
}
