import { db, type Tx } from "./db";
import { clientIp } from "./rateLimit";

export type AuditAction =
  | "auth.login"
  | "auth.login_failed"
  | "auth.locked"
  | "auth.logout"
  | "auth.register"
  | "auth.password_reset_requested"
  | "auth.password_reset"
  | "auth.password_changed"
  | "user.created"
  | "user.role_changed"
  | "user.blocked"
  | "user.unblocked"
  | "user.deleted"
  | "user.permissions_changed"
  | "order.created"
  | "order.status"
  | "order.payment"
  | "order.deleted"
  | "product.created"
  | "product.updated"
  | "product.deleted"
  | "stock.movement"
  | "settings.updated"
  | "upload";

/// Journal d'audit. Chaque action sensible laisse une trace horodatée avec
/// l'auteur, la cible, l'IP et le navigateur. Ce journal répond à la
/// question « qui a fait quoi, quand » après un incident — sans lui, une
/// fraude interne est indétectable.
///
/// Ne lève jamais : un échec d'écriture du journal ne doit pas faire
/// échouer l'action métier (mais il est signalé en console).
export async function audit(
  action: AuditAction,
  opts: {
    userId?: string | null;
    target?: string | null;
    meta?: Record<string, unknown>;
    req?: Request;
    tx?: Tx;
  } = {},
): Promise<void> {
  const client = opts.tx ?? db;
  try {
    await client.auditLog.create({
      data: {
        action,
        userId: opts.userId ?? null,
        target: opts.target ?? null,
        ip: opts.req ? clientIp(opts.req) : null,
        userAgent: opts.req?.headers.get("user-agent")?.slice(0, 256) ?? null,
        meta: opts.meta ? JSON.parse(JSON.stringify(opts.meta)) : undefined,
      },
    });
  } catch (err) {
    console.error("[audit] échec d'écriture", action, err);
  }
}
