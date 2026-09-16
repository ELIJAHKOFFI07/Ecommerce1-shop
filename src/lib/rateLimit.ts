import { db } from "./db";
import { ApiError } from "./apiError";

/// Limitation de débit à fenêtre fixe, persistée en base.
///
/// Pourquoi en base et pas en mémoire : sur Vercel chaque requête peut
/// tomber sur une instance différente ; un `Map` en mémoire laisserait
/// passer N × instances tentatives. La table RateLimit est partagée.
///
/// L'incrément est atomique (upsert avec expression SQL) : deux requêtes
/// simultanées ne peuvent pas lire le même compteur et le dépasser.
export type RateLimitRule = { limit: number; windowSec: number };

export const RULES = {
  login: { limit: 5, windowSec: 15 * 60 },          // 5 essais / 15 min / IP+email
  register: { limit: 3, windowSec: 60 * 60 },       // 3 inscriptions / h / IP
  forgotPassword: { limit: 3, windowSec: 60 * 60 }, // 3 demandes / h / email
  resetPassword: { limit: 5, windowSec: 15 * 60 },
  transfer: { limit: 10, windowSec: 60 * 60 },      // transferts P2P
  upload: { limit: 30, windowSec: 60 * 60 },
  api: { limit: 300, windowSec: 60 },               // garde-fou générique
} as const satisfies Record<string, RateLimitRule>;

export async function consumeRateLimit(scope: keyof typeof RULES, subject: string): Promise<void> {
  const rule = RULES[scope];
  const key = `${scope}:${subject}`.slice(0, 200);
  const now = new Date();
  const resetAt = new Date(now.getTime() + rule.windowSec * 1000);

  // Une seule requête SQL : crée la ligne, ou la remet à 1 si la fenêtre est
  // expirée, ou l'incrémente. Renvoie le compteur résultant.
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN ${resetAt} ELSE "RateLimit"."resetAt" END
    RETURNING "count"
  `;

  const count = rows[0]?.count ?? 1;
  if (count > rule.limit) {
    throw new ApiError(429, "Trop de tentatives. Réessayez dans quelques minutes.");
  }
}

/// Adresse IP du client derrière le proxy Vercel. `x-forwarded-for` peut
/// contenir une liste : la première entrée est le client réel.
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim().slice(0, 64);
  return req.headers.get("x-real-ip")?.slice(0, 64) ?? "unknown";
}

/// Nettoyage des fenêtres expirées — à appeler occasionnellement (cron).
export async function purgeExpiredRateLimits(): Promise<number> {
  const res = await db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } });
  return res.count;
}
