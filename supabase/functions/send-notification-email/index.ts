// Edge Function Supabase — envoie un e-mail à chaque notification créée.
//
// Déclenchée par le trigger on_notification_created (migration 009). Le
// contenu reprend exactement le titre et le corps de la notification : la
// table `notifications` reste l'unique source de vérité, et l'historique
// dans /play/notifications ne peut pas diverger de ce qui a été envoyé.
//
// Déploiement :
//   supabase functions deploy send-notification-email --no-verify-jwt
//
// Secrets requis :
//   supabase secrets set SMTP_HOST=smtp.gmail.com
//   supabase secrets set SMTP_PORT=465
//   supabase secrets set SMTP_USER=votre.adresse@gmail.com
//   supabase secrets set SMTP_PASSWORD=le-mot-de-passe-d-application-16-caracteres
//   supabase secrets set SMTP_FROM="DreamTeamShop <votre.adresse@gmail.com>"
//   supabase secrets set APP_URL=https://ecommerce1-shop.vercel.app
//   supabase secrets set WEBHOOK_SECRET=...
//
// ⚠️ SMTP_PASSWORD n'est PAS le mot de passe du compte Google : c'est un
// « mot de passe d'application », généré séparément (voir SMTP_SETUP.md).

import { createClient } from "jsr:@supabase/supabase-js@2";
// denomailer n'est pas publié sur JSR : la seule source est deno.land.
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { renderEmail, renderPlainText, type EmailKind } from "./templates.ts";

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
};

/// Chemin ouvert par le bouton de l'e-mail, selon le type de notification.
function targetPath(n: NotificationRow): string {
  const data = n.data ?? {};
  if (data.order_id) return "/play/orders";
  if (data.conversation_id) return `/play/messages/${data.conversation_id}`;
  if (data.auction_id) return "/play/auctions";
  if (data.product_id) return `/play/product/${data.product_id}`;
  return "/play/notifications";
}

/// Lien qui connecte le destinataire d'un clic, puis l'amène à la bonne page.
///
/// Le jeton est à **usage unique** : Supabase le consomme à la première
/// vérification. Il expire par ailleurs selon « Email OTP Expiration »
/// (Authentication → Email), à régler court — une heure suffit largement pour
/// une notification.
///
/// Le compromis est assumé : un e-mail transféré donne accès au compte tant
/// que le jeton est valide. C'est pourquoi il ne sert qu'une fois et pour peu
/// de temps. En cas d'échec — quota atteint, adresse inconnue — on retombe
/// sur le lien simple, qui mène à l'écran de connexion : l'e-mail part
/// toujours, il demande juste une identification.
async function signedLink(
  // deno-lint-ignore no-explicit-any
  admin: any,
  email: string,
  appUrl: string,
  path: string,
): Promise<string> {
  const plain = `${appUrl}${path}`;
  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    const hash = data?.properties?.hashed_token;
    if (error || !hash) {
      console.error("Lien de connexion indisponible", error);
      return plain;
    }
    const url = new URL("/auth/confirm", appUrl);
    url.searchParams.set("token_hash", hash);
    url.searchParams.set("type", "magiclink");
    url.searchParams.set("next", path);
    return url.toString();
  } catch (err) {
    console.error("Lien de connexion indisponible", err);
    return plain;
  }
}

function actionLabel(n: NotificationRow): string {
  const data = n.data ?? {};
  if (data.order_id) return "Suivre ma commande";
  if (data.conversation_id) return "Répondre";
  if (data.auction_id) return "Voir l'enchère";
  if (data.product_id) return "Voir le produit";
  return "Ouvrir l'application";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Déployée avec --no-verify-jwt, la fonction est joignable par n'importe
  // qui : sans ce contrôle, un tiers pourrait poster un payload arbitraire
  // et faire envoyer un e-mail à l'utilisateur de son choix, depuis votre
  // domaine. Le déclencheur SQL envoie ce secret (migration 009).
  const expectedSecret = Deno.env.get("WEBHOOK_SECRET");
  if (!expectedSecret || req.headers.get("x-webhook-secret") !== expectedSecret) {
    return new Response("Non autorisé", { status: 401 });
  }

  const host = Deno.env.get("SMTP_HOST");
  const user = Deno.env.get("SMTP_USER");
  const password = Deno.env.get("SMTP_PASSWORD");
  const from = Deno.env.get("SMTP_FROM") ?? user;
  if (!host || !user || !password || !from) {
    console.error("Configuration SMTP incomplète");
    return new Response("Configuration incomplète", { status: 500 });
  }

  const payload = await req.json();
  const notification = payload.record as NotificationRow | undefined;
  if (!notification) {
    return new Response("Payload sans record", { status: 400 });
  }

  // Service role : nécessaire pour lire l'e-mail dans auth.users, qui n'est
  // pas exposé au client. La clé n'existe que dans l'environnement de la
  // fonction, jamais dans le navigateur.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData, error } = await admin.auth.admin.getUserById(
    notification.user_id,
  );
  if (error || !userData?.user?.email) {
    console.error("Destinataire introuvable", error);
    return new Response("Destinataire introuvable", { status: 200 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, username")
    .eq("id", notification.user_id)
    .maybeSingle();
  const row = profile as { full_name: string | null; username: string } | null;
  const recipientName = row?.full_name?.split(" ")[0] ?? row?.username ?? null;

  const appUrl = Deno.env.get("APP_URL") ?? "";
  const path = targetPath(notification);
  const actionUrl = appUrl
    ? await signedLink(admin, userData.user.email, appUrl, path)
    : undefined;

  const html = renderEmail({
    kind: (notification.type as EmailKind) ?? "info",
    title: notification.title,
    body: notification.body,
    actionUrl,
    actionLabel: actionLabel(notification),
    recipientName,
  });

  const client = new SMTPClient({
    connection: {
      hostname: host,
      port: Number(Deno.env.get("SMTP_PORT") ?? 465),
      // Port 465 : chiffrement dès la connexion (TLS implicite).
      // Port 587 : connexion en clair puis STARTTLS.
      tls: Number(Deno.env.get("SMTP_PORT") ?? 465) === 465,
      auth: { username: user, password },
    },
  });

  try {
    await client.send({
      from,
      to: userData.user.email,
      subject: notification.title,
      // Les deux versions sont envoyées : un message en HTML seul est
      // nettement plus souvent classé en indésirable.
      content: renderPlainText({
        title: notification.title,
        body: notification.body,
        actionUrl,
      }),
      html,
    });
  } catch (err) {
    console.error("Envoi SMTP échoué", err);
  } finally {
    await client.close().catch(() => {});
  }

  // 200 systématique : un échec d'envoi ne doit ni faire réessayer le webhook
  // en boucle, ni bloquer la création de la notification.
  return new Response("OK", { status: 200 });
});
