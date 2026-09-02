import { renderEmail, renderPlainText, type EmailKind } from "@/lib/emailTemplates";

/// Envoi d'e-mail via l'API transactionnelle Brevo (REST — pas besoin d'un
/// SDK, un `fetch` suffit et évite une dépendance de plus).
///
/// Mode console si BREVO_API_KEY est absent : l'e-mail est affiché dans les
/// logs serveur au lieu d'être réellement envoyé — même principe que
/// src/lib/sms.ts. **C'est le mode actif tant que la clé Brevo n'a pas été
/// fournie** (voir NEXTJS_BACKEND_MIGRATION.md).
export function isEmailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
}

export async function sendNotificationEmail({
  to,
  recipientName,
  kind,
  title,
  body,
  actionUrl,
  actionLabel,
}: {
  to: string;
  recipientName?: string | null;
  kind: EmailKind;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
}) {
  const html = renderEmail({ kind, title, body, actionUrl, actionLabel, recipientName });
  const text = renderPlainText({ title, body, actionUrl });

  if (!isEmailConfigured()) {
    console.log(`[email:console] à ${to} — [${kind}] ${title}\n${text}`);
    return { mode: "console" as const };
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY!,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME || "DreamTeamShop",
      },
      to: [{ email: to, name: recipientName || undefined }],
      subject: title,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Échec de l'envoi Brevo (${response.status}) : ${detail}`);
  }

  return { mode: "brevo" as const };
}
