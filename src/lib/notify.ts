import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/email";
import type { EmailKind } from "@/lib/emailTemplates";

/// Crée une notification in-app ET tente l'e-mail correspondant —
/// équivalent du trigger dispatch_notification côté Supabase (qui appelait
/// l'Edge Function à chaque INSERT dans `notifications`). Postgres seul n'a
/// pas de mécanisme équivalent ici (pas de trigger SQL branché sur une API
/// externe) : ce point d'entrée le remplace, à appeler à la place d'un
/// `db.notification.create(...)` direct partout où le destinataire doit
/// aussi être prévenu par e-mail.
///
/// L'échec de l'e-mail ne fait jamais échouer l'action qui a déclenché la
/// notification (une commande, une offre…) — il est seulement loggé.
export async function notifyUser({
  userId,
  type,
  title,
  body,
  data,
  actionUrl,
  actionLabel,
}: {
  userId: string;
  type: EmailKind;
  title: string;
  body: string;
  data?: object;
  actionUrl?: string;
  actionLabel?: string;
}) {
  const notification = await db.notification.create({
    data: { userId, type, title, body, data: data ?? {} },
  });

  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, fullName: true, username: true } });
  if (user?.email) {
    sendNotificationEmail({
      to: user.email,
      recipientName: user.fullName || user.username,
      kind: type,
      title,
      body,
      actionUrl,
      actionLabel,
    }).catch((err) => console.error(`[notify] échec e-mail à ${user.email} :`, err));
  }

  return notification;
}
