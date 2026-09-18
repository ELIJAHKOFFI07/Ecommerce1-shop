import nodemailer from "nodemailer";
import { formatFcfa } from "./money";

/// E-mails transactionnels via Gmail SMTP (mot de passe d'application).
/// Sans configuration, les messages sont affichés en console. Tout
/// contenu variable est échappé.
const BRAND = "DreamShop";
const from = () => `"${BRAND}" <${process.env.GMAIL_USER}>`;

export const isEmailConfigured = () => Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

function transport() {
  return nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } });
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#fafaf9;font-family:Montserrat,Helvetica,Arial,sans-serif;color:#0c0a09">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px">
    <div style="font-size:22px;font-weight:700;letter-spacing:-0.02em;margin-bottom:28px">Dream<span style="color:#a16207">Shop</span></div>
    <h1 style="font-size:20px;font-weight:600;margin:0 0 16px">${escapeHtml(title)}</h1>
    <div style="font-size:15px;line-height:1.6">${body}</div>
    <p style="margin-top:36px;font-size:12px;color:#78716c">Vous recevez cet e-mail parce qu'un compte ${BRAND} est associé à cette adresse.</p>
  </div></body></html>`;
}

const button = (href: string, label: string) => `<p style="margin:28px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#1c1917;color:#fff;text-decoration:none;padding:14px 24px;border-radius:6px;font-weight:600">${escapeHtml(label)}</a></p>`;

export async function sendEmail(input: { to: string; subject: string; title: string; html: string; text: string }): Promise<void> {
  if (!isEmailConfigured()) {
    console.info(`[email:console] à ${input.to} — ${input.subject}\n${input.text}`);
    return;
  }
  try {
    await transport().sendMail({ from: from(), to: input.to, subject: input.subject, text: input.text, html: layout(input.title, input.html) });
  } catch (err) {
    console.error("[email] échec d'envoi", err);
  }
}

const app = () => process.env.NEXT_PUBLIC_APP_URL ?? "";

export async function sendPasswordReset(to: string, name: string, link: string) {
  await sendEmail({
    to, subject: "Réinitialisation de votre mot de passe", title: "Réinitialiser votre mot de passe",
    text: `Bonjour ${name},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 30 minutes) :\n${link}`,
    html: `<p>Bonjour ${escapeHtml(name)},</p><p>Pour choisir un nouveau mot de passe, cliquez ci-dessous. Le lien est valable <strong>30 minutes</strong>.</p>${button(link, "Choisir un nouveau mot de passe")}`,
  });
}

export async function sendWelcome(to: string, name: string, tempPassword?: string) {
  const pwd = tempPassword ? `<p>Votre mot de passe temporaire : <code style="background:#f5f5f4;padding:2px 6px;border-radius:4px">${escapeHtml(tempPassword)}</code><br>Changez-le à la première connexion.</p>` : "";
  await sendEmail({
    to, subject: `Bienvenue sur ${BRAND}`, title: `Bienvenue, ${name}`,
    text: `Votre compte ${BRAND} est créé.${tempPassword ? ` Mot de passe temporaire : ${tempPassword}` : ""}`,
    html: `<p>Votre compte est créé.</p>${pwd}${button(`${app()}/connexion`, "Se connecter")}`,
  });
}

const STATUS_FR: Record<string, string> = {
  PENDING: "reçue — nous la préparons",
  CONFIRMED: "confirmée",
  SHIPPED: "expédiée",
  DELIVERED: "livrée",
  CANCELLED: "annulée",
};

export async function sendOrderStatus(to: string, name: string, order: { id: string; orderNumber: string; status: string; total: unknown; cancelReason?: string | null }) {
  const label = STATUS_FR[order.status] ?? order.status.toLowerCase();
  await sendEmail({
    to, subject: `Commande ${order.orderNumber} ${label.split(" — ")[0]}`, title: `Votre commande ${order.orderNumber} est ${label.split(" — ")[0]}`,
    text: `Bonjour ${name}, votre commande ${order.orderNumber} (${formatFcfa(order.total as never)}) est ${label}.${order.cancelReason ? ` Motif : ${order.cancelReason}` : ""}`,
    html: `<p>Bonjour ${escapeHtml(name)},</p><p>Votre commande <strong>${escapeHtml(order.orderNumber)}</strong> (${escapeHtml(formatFcfa(order.total as never))}) est <strong>${escapeHtml(label)}</strong>.</p>${order.cancelReason ? `<p>Motif : ${escapeHtml(order.cancelReason)}</p>` : ""}${button(`${app()}/compte/commandes/${order.id}`, "Voir ma commande")}`,
  });
}

export async function sendNewOrderToAdmin(to: string, order: { id: string; orderNumber: string; total: unknown; customer: string; paymentMethod: string }) {
  await sendEmail({
    to, subject: `Nouvelle commande ${order.orderNumber}`, title: `Nouvelle commande ${order.orderNumber}`,
    text: `${order.customer} — ${formatFcfa(order.total as never)} — ${order.paymentMethod}. ${app()}/admin/commandes/${order.id}`,
    html: `<p><strong>${escapeHtml(order.customer)}</strong> — ${escapeHtml(formatFcfa(order.total as never))} — ${escapeHtml(order.paymentMethod === "MOBILE_MONEY" ? "Mobile Money" : "Paiement à la livraison")}.</p>${button(`${app()}/admin/commandes/${order.id}`, "Traiter la commande")}`,
  });
}
