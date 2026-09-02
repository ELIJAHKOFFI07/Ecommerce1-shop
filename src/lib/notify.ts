import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/email";
import type { EmailKind } from "@/lib/emailTemplates";

/// Équivalent du trigger `dispatch_notification` de Supabase, qui appelait
/// l'Edge Function d'envoi à chaque INSERT dans `notifications`. Postgres
/// seul n'a pas de mécanisme équivalent (pas de trigger SQL branché sur une
/// API externe) : ces helpers le remplacent côté application.
///
/// **Deux fonctions, pas une**, à cause des transactions. Une notification
/// créée à l'intérieur d'un `$transaction` doit y rester : si la commande
/// échoue et que la transaction est annulée, la notification doit disparaître
/// avec elle. Mais l'e-mail, lui, ne peut pas être annulé une fois parti —
/// il ne doit donc être envoyé qu'APRÈS le commit, sinon on annonce à un
/// vendeur une commande qui n'existe pas.
///
///   Dans une transaction :  tx.notification.create(...) puis, après le
///                           commit, emailNotification(...)
///   Hors transaction :      notifyUser(...) fait les deux

type NotificationInput = {
  userId: string;
  type: EmailKind;
  title: string;
  body: string;
  data?: object;
  actionUrl?: string;
  actionLabel?: string;
};

/// Envoie l'e-mail correspondant à une notification déjà créée. Ne lève
/// jamais : l'échec d'un e-mail ne doit pas faire échouer (ni rejouer)
/// l'action métier qui vient de réussir.
export async function emailNotification({
  userId,
  type,
  title,
  body,
  actionUrl,
  actionLabel,
}: NotificationInput) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true, username: true },
    });
    if (!user?.email) return;

    await sendNotificationEmail({
      to: user.email,
      recipientName: user.fullName || user.username,
      kind: type,
      title,
      body,
      actionUrl,
      actionLabel,
    });
  } catch (err) {
    console.error(`[notify] échec e-mail pour ${userId} :`, err);
  }
}

/// Crée la notification en base ET envoie l'e-mail. À n'utiliser QUE hors
/// transaction (voir le commentaire en tête de fichier).
export async function notifyUser(input: NotificationInput) {
  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? {},
    },
  });

  await emailNotification(input);
  return notification;
}
