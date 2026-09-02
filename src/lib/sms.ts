import twilio from "twilio";

/// Envoi de SMS/WhatsApp — cas rares dans l'app (vérification de téléphone,
/// alerte critique), donc pas besoin d'une file d'attente : un envoi direct
/// suffit.
///
/// Mode console si TWILIO_ACCOUNT_SID est absent : le code/message est
/// affiché dans les logs serveur au lieu d'être réellement envoyé — utile en
/// dev pour ne pas consommer de crédit Twilio, et pour que le reste du flux
/// (inscription, vérification…) reste testable sans compte Twilio.
export function isSmsConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

function client() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

/// "SMS" ou "WHATSAPP" — WhatsApp coûte moins cher par message mais suppose
/// que le destinataire a l'app ; réglable sans changer le code appelant.
function preferredChannel(): "SMS" | "WHATSAPP" {
  return process.env.PREFERRED_SMS_CHANNEL === "WHATSAPP" ? "WHATSAPP" : "SMS";
}

/**
 * Envoie un message texte au numéro donné (format E.164, ex. +2250700000000)
 * via le canal préféré (PREFERRED_SMS_CHANNEL).
 */
export async function sendSms(to: string, body: string) {
  if (!isSmsConfigured()) {
    console.log(`[sms:console] à ${to} — ${body}`);
    return { mode: "console" as const };
  }

  const channel = preferredChannel();
  if (channel === "WHATSAPP") {
    await client().messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:${to}`,
      body,
    });
  } else {
    await client().messages.create({
      from: process.env.TWILIO_SMS_FROM,
      to,
      body,
    });
  }
  return { mode: channel.toLowerCase() as "sms" | "whatsapp" };
}

/// Code de vérification à 6 chiffres — même format que le code de retrait
/// (lib/orderTransition.ts) pour rester cohérent dans toute l'app.
export function generateVerificationCode(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}
