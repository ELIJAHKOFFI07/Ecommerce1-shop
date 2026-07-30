// Edge Function Supabase — envoie un e-mail à chaque notification créée.
//
// Déclenchée par un Database Webhook sur INSERT dans public.notifications
// (voir NOTIFICATIONS_SETUP.md). Le contenu de l'e-mail reprend exactement le
// titre et le corps de la notification : la table notifications reste donc
// l'unique source de vérité et sert d'historique dans /play/notifications.
//
// Déploiement :
//   supabase functions deploy send-notification-email --no-verify-jwt
//
// Secrets requis :
//   supabase secrets set RESEND_API_KEY=re_xxx
//   supabase secrets set NOTIFY_FROM="DreamTeamShop <no-reply@votre-domaine.com>"
//   supabase secrets set APP_URL=https://votre-domaine.vercel.app

import { createClient } from "jsr:@supabase/supabase-js@2";

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("NOTIFY_FROM");
  if (!apiKey || !from) {
    console.error("RESEND_API_KEY ou NOTIFY_FROM manquant");
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

  const { data: user, error } = await admin.auth.admin.getUserById(
    notification.user_id,
  );
  if (error || !user?.user?.email) {
    console.error("Utilisateur ou e-mail introuvable", error);
    return new Response("Destinataire introuvable", { status: 200 });
  }

  const appUrl = Deno.env.get("APP_URL") ?? "";
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto">
      <h2 style="color:#b8933a;margin-bottom:4px">${escapeHtml(notification.title)}</h2>
      <p style="font-size:15px;line-height:1.5;color:#222">
        ${escapeHtml(notification.body).replace(/\n/g, "<br>")}
      </p>
      ${
        appUrl
          ? `<p style="margin-top:24px">
               <a href="${appUrl}/play/notifications"
                  style="background:#e6c15c;color:#000;padding:10px 18px;
                         border-radius:999px;text-decoration:none;font-weight:600">
                 Voir dans l'application
               </a>
             </p>`
          : ""
      }
      <p style="margin-top:32px;font-size:12px;color:#888">
        DreamTeamShop — vous recevez cet e-mail car vous avez un compte sur la plateforme.
      </p>
    </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: user.user.email,
      subject: notification.title,
      html,
    }),
  });

  if (!res.ok) {
    console.error("Resend a refusé l'envoi", await res.text());
    // 200 volontaire : un échec d'e-mail ne doit pas faire réessayer le
    // webhook en boucle ni bloquer la création de la notification.
    return new Response("Envoi échoué", { status: 200 });
  }

  return new Response("OK", { status: 200 });
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
