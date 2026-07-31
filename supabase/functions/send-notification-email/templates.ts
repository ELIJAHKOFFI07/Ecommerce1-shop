/**
 * Gabarits d'e-mail.
 *
 * Contraintes propres à l'e-mail, qui expliquent les choix ci-dessous :
 *  - pas de feuille de style externe ni de <style> fiable : tout est en
 *    attributs `style` en ligne (Gmail retire les balises <style> dans
 *    certaines vues) ;
 *  - mise en page en <table> : Outlook ignore flexbox et grid ;
 *  - pas de police distante : Gmail bloque @font-face, on décrit donc une
 *    pile système qui rend proprement partout ;
 *  - couleurs en dur : les variables CSS du thème ne franchissent pas la
 *    frontière du client de messagerie. On reprend les valeurs du mode
 *    sombre de l'application (or sur fond noir).
 */

const GOLD = "#e6c15c";
const GOLD_DARK = "#b8933a";
const INK = "#0b0b0d";
const SURFACE = "#16161a";
const BORDER = "#3a3a40";
const MUTED = "#9a9aa0";

/// Pile système : rend en Segoe UI sous Windows, San Francisco sous
/// macOS/iOS, Roboto sous Android. Aucune police à télécharger.
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

export type EmailKind =
  | "order"
  | "offer"
  | "auction"
  | "message"
  | "price_drop"
  | "info";

/// Chaque type reçoit son emblème et sa couleur d'accent : une commande et
/// une fin d'enchère ne doivent pas se confondre dans une boîte de réception.
const KINDS: Record<EmailKind, { emoji: string; label: string; accent: string }> = {
  order: { emoji: "📦", label: "Commande", accent: GOLD },
  offer: { emoji: "🤝", label: "Offre", accent: "#3987e5" },
  auction: { emoji: "🔨", label: "Enchère", accent: "#9085e9" },
  message: { emoji: "✉️", label: "Message", accent: "#199e70" },
  price_drop: { emoji: "📉", label: "Baisse de prix", accent: "#e0708f" },
  info: { emoji: "🔔", label: "Information", accent: GOLD },
};

/// Mélange une couleur avec le fond de carte, et renvoie un hex à 6
/// chiffres. Un hex à 8 chiffres (`#rrggbbaa`) serait plus court, mais
/// Outlook l'ignore : la pastille se retrouverait sans fond.
///
/// Le taux est volontairement faible : plus le fond s'éclaircit, moins le
/// libellé s'en détache. À 0,15 la pastille « Offre » tombait à 4,14:1,
/// sous le seuil de 4,5:1 — le texte fait 11 px, la tolérance « grand
/// texte » ne s'applique pas. À 0,08 le pire cas remonte à 4,54:1.
function tint(hex: string, ratio = 0.08): string {
  const c = hex.replace("#", "");
  const s = SURFACE.replace("#", "");
  const mix = (i: number) => {
    const fg = parseInt(c.slice(i * 2, i * 2 + 2), 16);
    const bg = parseInt(s.slice(i * 2, i * 2 + 2), 16);
    return Math.round(fg * ratio + bg * (1 - ratio))
      .toString(16)
      .padStart(2, "0");
  };
  return `#${mix(0)}${mix(1)}${mix(2)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEmail({
  kind,
  title,
  body,
  actionUrl,
  actionLabel,
  recipientName,
}: {
  kind: EmailKind;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
  recipientName?: string | null;
}): string {
  const k = KINDS[kind] ?? KINDS.info;
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body).replace(/\n/g, "<br>");
  const greeting = recipientName
    ? `Bonjour ${escapeHtml(recipientName)},`
    : "Bonjour,";

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#0b0b0d;font-family:${FONT};-webkit-font-smoothing:antialiased;">

  <!-- Texte d'aperçu : ce que la boîte de réception affiche à côté de
       l'objet. Masqué dans le corps du message. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(body).slice(0, 120)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0d;padding:32px 16px;">
    <tr>
      <td align="center">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${SURFACE};border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">

          <!-- En-tête -->
          <tr>
            <td style="padding:28px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:20px;font-weight:700;color:${GOLD};letter-spacing:-0.3px;">
                    ✦ DreamTeamShop
                  </td>
                  <td align="right">
                    <span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${tint(k.accent)};color:${k.accent};font-size:11px;font-weight:600;">
                      ${k.emoji}&nbsp;${k.label}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Filet d'accent -->
          <tr>
            <td style="padding:20px 32px 0;">
              <div style="height:2px;background:${k.accent};border-radius:2px;width:40px;"></div>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td style="padding:16px 32px 0;">
              <p style="margin:0 0 12px;font-size:14px;color:${MUTED};">${greeting}</p>
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:700;color:#ffffff;">
                ${safeTitle}
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#d8d8dc;">
                ${safeBody}
              </p>
            </td>
          </tr>

          ${
            actionUrl
              ? `<!-- Bouton -->
          <tr>
            <td style="padding:28px 32px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:999px;background:${GOLD};">
                    <a href="${actionUrl}"
                       style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:${INK};text-decoration:none;border-radius:999px;">
                      ${escapeHtml(actionLabel ?? "Voir dans l'application")}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:12px 0 0;font-size:11px;color:${MUTED};">
                Ce bouton vous connecte directement. Il ne fonctionne
                qu&apos;une seule fois — ne transférez pas cet e-mail.
              </p>
            </td>
          </tr>`
              : ""
          }

          <!-- Pied -->
          <tr>
            <td style="padding:32px;">
              <div style="height:1px;background:${BORDER};margin-bottom:20px;"></div>
              <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:${MUTED};">
                Vous recevez cet e-mail parce que vous avez un compte sur
                DreamTeamShop, la marketplace sociale de Côte d'Ivoire.
              </p>
              <p style="margin:0;font-size:12px;color:${MUTED};">
                Retrouvez tout votre historique dans
                <span style="color:${GOLD_DARK};">Mon compte → Notifications</span>.
              </p>
            </td>
          </tr>

        </table>

        <p style="margin:20px 0 0;font-size:11px;color:#6b6b70;">
          © ${new Date().getFullYear()} DreamTeamShop
        </p>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/// Version texte, indispensable : un message envoyé en HTML seul est
/// nettement plus souvent classé en indésirable, et certains clients
/// n'affichent que celle-ci.
export function renderPlainText({
  title,
  body,
  actionUrl,
}: {
  title: string;
  body: string;
  actionUrl?: string;
}): string {
  return [
    "DreamTeamShop",
    "",
    title,
    "",
    body,
    actionUrl
      ? `\nVoir dans l'application : ${actionUrl}\n(Ce lien vous connecte directement et ne fonctionne qu'une seule fois. Ne le transférez pas.)`
      : "",
    "",
    "—",
    "Vous recevez cet e-mail parce que vous avez un compte sur DreamTeamShop.",
  ]
    .filter(Boolean)
    .join("\n");
}
