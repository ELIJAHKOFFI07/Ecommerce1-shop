/* eslint-disable no-undef */
/**
 * Service worker des notifications push.
 *
 * Il reçoit les messages quand l'onglet est fermé ou en arrière-plan. Il doit
 * être servi à la racine du domaine : Next.js publie automatiquement le
 * contenu de `public/`, donc ce fichier est accessible sur
 * https://<domaine>/firebase-messaging-sw.js
 *
 * Les valeurs ci-dessous sont volontairement écrites en dur : un service
 * worker n'a pas accès aux variables d'environnement, et ces clés sont de
 * toute façon publiques (elles partent déjà dans le bundle du navigateur).
 * Le secret, lui, est le compte de service — il reste côté Supabase.
 *
 * La version du SDK doit rester alignée sur celle de `firebase` dans
 * package.json.
 */
importScripts(
  "https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyDJgE4t0qLELnloGWNatMmFlyi9Fl4Xk8E",
  authDomain: "dreamteamshop.firebaseapp.com",
  projectId: "dreamteamshop",
  storageBucket: "dreamteamshop.firebasestorage.app",
  messagingSenderId: "756530241232",
  appId: "1:756530241232:web:bfd67650faf3f1461408d5",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? payload.data?.title ?? "DreamTeamShop";
  const body = payload.notification?.body ?? payload.data?.body ?? "";

  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    // Regroupe les notifications d'une même commande plutôt que d'empiler
    // dix bulles pour un seul suivi.
    tag: payload.data?.order_id ?? payload.data?.type ?? "dreamteamshop",
    data: { url: payload.data?.url ?? "/play/notifications" },
  });
});

/**
 * Au clic : on réutilise un onglet déjà ouvert sur le site plutôt que d'en
 * empiler un nouveau à chaque notification.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/play/notifications";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
