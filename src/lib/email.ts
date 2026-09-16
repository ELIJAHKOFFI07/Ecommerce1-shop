import nodemailer from "nodemailer";

/// E-mails transactionnels via Gmail SMTP (mot de passe d'application).
/// Sans configuration, les messages sont affichés en console : l'app
/// fonctionne en développement sans compte Gmail.
///
/// Tout contenu variable est échappé : un nom d'utilisateur contenant du
/// HTML ne doit pas devenir du HTML dans la boîte du destinataire.

const from = () => `"SuperlifeShop" <${process.env.GMAIL_USER}>`;

export const isEmailConfigured = () => Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

function transport() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#fafaf9;font-family:Montserrat,Helvetica,Arial,sans-serif;color:#0c0a09">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px">
    <div style="font-size:22px;font-weight:700;letter-spacing:-0.02em;margin-bottom:28px">Superlife<span style="color:#a16207">Shop</span></div>
    <h1 style="font-size:20px;font-weight:600;margin:0 0 16px">${escapeHtml(title)}</h1>
    <div style="font-size:15px;line-height:1.6">${body}</div>
    <p style="margin-top:36px;font-size:12px;color:#78716c">Vous recevez cet e-mail parce qu'un compte SuperlifeShop est associé à cette adresse. Si vous n'êtes pas à l'origine de cette action, ignorez ce message.</p>
  </div></body></html>`;
}

export async function sendEmail(input: { to: string; subject: string; title: string; html: string; text: string }): Promise<void> {
  if (!isEmailConfigured()) {
    console.info(`[email:console] à ${input.to} — ${input.subject}\n${input.text}`);
    return;
  }
  try {
    await transport().sendMail({ from: from(), to: input.to, subject: input.subject, text: input.text, html: layout(input.title, input.html) });
  } catch (err) {
    // Un e-mail qui ne part pas ne doit pas faire échouer l'action métier.
    console.error("[email] échec d'envoi", err);
  }
}

export async function sendPasswordReset(to: string, name: string, link: string) {
  await sendEmail({
    to,
    subject: "Réinitialisation de votre mot de passe",
    title: "Réinitialiser votre mot de passe",
    text: `Bonjour ${name},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 30 minutes) :\n${link}\n\nSi vous n'avez rien demandé, ignorez ce message.`,
    html: `<p>Bonjour ${escapeHtml(name)},</p><p>Pour choisir un nouveau mot de passe, cliquez sur le bouton ci-dessous. Le lien est valable <strong>30 minutes</strong>.</p>
      <p style="margin:28px 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#1c1917;color:#fff;text-decoration:none;padding:14px 24px;border-radius:6px;font-weight:600">Choisir un nouveau mot de passe</a></p>`,
  });
}

export async function sendWelcome(to: string, name: string, memberNumber: string, tempPassword?: string) {
  const pwd = tempPassword
    ? `<p>Votre mot de passe temporaire : <code style="background:#f5f5f4;padding:2px 6px;border-radius:4px">${escapeHtml(tempPassword)}</code><br>Vous devrez le changer à la première connexion.</p>`
    : "";
  await sendEmail({
    to,
    subject: "Bienvenue sur SuperlifeShop",
    title: `Bienvenue, ${name}`,
    text: `Votre compte est créé. Numéro de membre : ${memberNumber}.${tempPassword ? ` Mot de passe temporaire : ${tempPassword}` : ""}`,
    html: `<p>Votre compte est créé.</p><p>Votre numéro de membre : <strong>${escapeHtml(memberNumber)}</strong></p>${pwd}
      <p style="margin:28px 0"><a href="${escapeHtml(process.env.NEXT_PUBLIC_APP_URL ?? "")}/connexion" style="display:inline-block;background:#1c1917;color:#fff;text-decoration:none;padding:14px 24px;border-radius:6px;font-weight:600">Se connecter</a></p>`,
  });
}

export async function sendOrderStatus(to: string, name: string, orderNumber: string, status: string, reason?: string | null) {
  const labels: Record<string, string> = {
    VALIDATED: "validée — les produits sont dans votre stock personnel",
    REJECTED: "rejetée",
    CANCELLED: "annulée",
    REFUNDED: "remboursée",
    DELIVERED: "livrée",
  };
  const label = labels[status] ?? status.toLowerCase();
  await sendEmail({
    to,
    subject: `Commande ${orderNumber} ${label.split(" — ")[0]}`,
    title: `Votre commande ${orderNumber} est ${label.split(" — ")[0]}`,
    text: `Bonjour ${name}, votre commande ${orderNumber} est ${label}.${reason ? ` Motif : ${reason}` : ""}`,
    html: `<p>Bonjour ${escapeHtml(name)},</p><p>Votre commande <strong>${escapeHtml(orderNumber)}</strong> est <strong>${escapeHtml(label)}</strong>.</p>${reason ? `<p>Motif : ${escapeHtml(reason)}</p>` : ""}`,
  });
}

export async function sendDeliveryStatus(to: string, name: string, status: string, reason?: string | null) {
  const labels: Record<string, string> = {
    APPROVED: "approuvé — vous pouvez passer au bureau",
    DELIVERED: "remis",
    REJECTED: "refusé",
  };
  const label = labels[status] ?? status.toLowerCase();
  await sendEmail({
    to,
    subject: `Votre retrait est ${label.split(" — ")[0]}`,
    title: `Retrait ${label.split(" — ")[0]}`,
    text: `Bonjour ${name}, votre demande de retrait est ${label}.${reason ? ` Motif : ${reason}` : ""}`,
    html: `<p>Bonjour ${escapeHtml(name)},</p><p>Votre demande de retrait est <strong>${escapeHtml(label)}</strong>.</p>${reason ? `<p>Motif : ${escapeHtml(reason)}</p>` : ""}`,
  });
}

export async function sendWalletCredit(to: string, name: string, amount: string, balance: string) {
  await sendEmail({
    to,
    subject: "Votre solde a été crédité",
    title: "Solde crédité",
    text: `Bonjour ${name}, votre solde a été crédité de ${amount}. Nouveau solde : ${balance}.`,
    html: `<p>Bonjour ${escapeHtml(name)},</p><p>Votre solde a été crédité de <strong>${escapeHtml(amount)}</strong>.<br>Nouveau solde : <strong>${escapeHtml(balance)}</strong>.</p>`,
  });
}
