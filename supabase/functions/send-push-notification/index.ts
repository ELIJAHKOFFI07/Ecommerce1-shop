// Edge Function Supabase — envoie une notification push à chaque
// notification créée en base.
//
// Déclenchée par un Database Webhook sur INSERT dans public.notifications,
// exactement comme l'envoi d'e-mail : la table reste l'unique source de
// vérité, et l'historique dans /play/notifications ne peut pas diverger de
// ce qui a été notifié.
//
// Déploiement :
//   supabase functions deploy send-push-notification --no-verify-jwt
//
// Secret requis (le fichier JSON du compte de service, en une ligne) :
//   supabase secrets set FIREBASE_SERVICE_ACCOUNT="$(cat service-account.json)"

import { createClient } from "jsr:@supabase/supabase-js@2";

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
};

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

/// Un jeton OAuth vaut une heure : on le garde en mémoire entre deux appels
/// plutôt que de re-signer un JWT à chaque notification.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(account: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const unsigned = `${encode(header)}.${encode(claims)}`;

  // La clé arrive au format PEM ; les retours à la ligne sont souvent
  // échappés en \n littéraux lorsqu'elle transite par une variable
  // d'environnement — il faut les restaurer avant de la décoder.
  const pem = account.private_key
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binary = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binary,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );

  const encodedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signature)),
  )
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${encodedSignature}`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Jeton OAuth refusé : ${await res.text()}`);
  }

  const json = await res.json();
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.value;
}

/// Chemin ouvert au clic, selon le type de notification.
function targetPath(n: NotificationRow): string {
  const data = n.data ?? {};
  if (data.order_id) return "/play/orders";
  if (data.conversation_id) return `/play/messages/${data.conversation_id}`;
  if (data.auction_id) return "/play/auctions";
  if (data.product_id) return `/play/product/${data.product_id}`;
  return "/play/notifications";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Déployée avec --no-verify-jwt, la fonction est joignable par n'importe
  // qui : sans ce contrôle, un tiers pourrait poster un payload arbitraire
  // et faire apparaître une notification chez l'utilisateur de son choix.
  // Le déclencheur SQL envoie ce secret dans l'en-tête (migration 009).
  const expected = Deno.env.get("WEBHOOK_SECRET");
  if (!expected || req.headers.get("x-webhook-secret") !== expected) {
    return new Response("Non autorisé", { status: 401 });
  }

  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) {
    console.error("FIREBASE_SERVICE_ACCOUNT manquant");
    return new Response("Configuration incomplète", { status: 500 });
  }

  const payload = await req.json();
  const notification = payload.record as NotificationRow | undefined;
  if (!notification) {
    return new Response("Payload sans record", { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: profile } = await admin
    .from("profiles")
    .select("fcm_token")
    .eq("id", notification.user_id)
    .maybeSingle();

  const token = (profile as { fcm_token: string | null } | null)?.fcm_token;
  if (!token) {
    // Destinataire non abonné : cas normal, pas une erreur.
    return new Response("Pas de jeton", { status: 200 });
  }

  try {
    const account = JSON.parse(raw) as ServiceAccount;
    const accessToken = await getAccessToken(account);

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: {
              title: notification.title,
              body: notification.body,
            },
            // Les données servent au service worker (regroupement, cible du
            // clic) : elles doivent être des chaînes, FCM refuse les autres
            // types.
            data: {
              type: String(notification.type ?? ""),
              url: targetPath(notification),
              ...(notification.data?.order_id
                ? { order_id: String(notification.data.order_id) }
                : {}),
            },
            webpush: {
              fcmOptions: {
                link: `${Deno.env.get("APP_URL") ?? ""}${targetPath(notification)}`,
              },
            },
          },
        }),
      },
    );

    if (!res.ok) {
      const detail = await res.text();
      console.error("FCM a refusé l'envoi", detail);

      // Jeton devenu invalide (application désinstallée, autorisation
      // retirée) : on le retire pour ne pas retenter à chaque notification.
      if (res.status === 404 || detail.includes("UNREGISTERED")) {
        await admin
          .from("profiles")
          .update({ fcm_token: null })
          .eq("id", notification.user_id);
      }
    }
  } catch (err) {
    console.error("Envoi push impossible", err);
  }

  // 200 systématique : un échec d'envoi ne doit ni faire réessayer le webhook
  // en boucle, ni bloquer la création de la notification.
  return new Response("OK", { status: 200 });
});
