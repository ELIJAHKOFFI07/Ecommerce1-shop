import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import { db } from "./db";
import { authConfig } from "./auth.config";
import { verifyPassword } from "./password";
import { consumeRateLimit, clientIp } from "./rateLimit";
import { audit } from "./audit";
import { ApiError } from "./apiError";

/// Verrouillage progressif : 5 échecs → 15 min, 10 échecs → 1 h, 15 → 24 h.
/// Le compteur ne se remet à zéro qu'après une connexion réussie. Contre
/// la force brute, c'est plus robuste qu'une limite par IP seule (un
/// attaquant change d'IP facilement, pas de compte cible).
function lockDurationMs(failed: number): number {
  if (failed >= 15) return 24 * 60 * 60 * 1000;
  if (failed >= 10) return 60 * 60 * 1000;
  if (failed >= 5) return 15 * 60 * 1000;
  return 0;
}

class InvalidLogin extends CredentialsSignin {
  code = "invalid";
}
class LockedLogin extends CredentialsSignin {
  code = "locked";
}
class BlockedLogin extends CredentialsSignin {
  code = "blocked";
}
class TooMany extends CredentialsSignin {
  code = "ratelimited";
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

/// Champs de session : ce qu'on met dans le JWT. Rien de sensible (pas de
/// hash, pas de téléphone), juste ce qu'il faut pour autoriser.
const sessionSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  blocked: true,
} as const;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // Le typage de l'adaptateur vise l'ancien générateur Prisma ; le client
  // Prisma 7 (générateur `prisma-client`) expose la même surface.
  adapter: PrismaAdapter(db as never),
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, req) {
        const parsed = credentialsSchema.safeParse(raw);
        // Même message pour « format invalide » et « mauvais mot de passe » :
        // on ne dit jamais à l'appelant ce qui a échoué.
        if (!parsed.success) throw new InvalidLogin();
        const { email, password } = parsed.data;
        const ip = clientIp(req);

        // Deux limites : par IP (pulvérisation sur plusieurs comptes) et par
        // email (attaque ciblée depuis plusieurs IP).
        try {
          await consumeRateLimit("login", ip);
          await consumeRateLimit("login", email);
        } catch (err) {
          // Seule la limite (429) devient « trop de tentatives » ; une panne
          // de base doit rester visible dans les journaux, pas déguisée.
          if (err instanceof ApiError && err.status === 429) throw new TooMany();
          console.error("[auth] limitation de débit indisponible", err);
          throw err;
        }

        const user = await db.user.findUnique({
          where: { email },
          select: { ...sessionSelect, passwordHash: true, failedLogins: true, lockedUntil: true },
        });

        if (user?.lockedUntil && user.lockedUntil > new Date()) {
          await audit("auth.locked", { userId: user.id, req, meta: { until: user.lockedUntil } });
          throw new LockedLogin();
        }

        // verifyPassword compare toujours contre un hash, même si l'utilisateur
        // n'existe pas — temps de réponse identique dans les deux cas.
        const valid = await verifyPassword(password, user?.passwordHash ?? null);

        if (!user || !valid) {
          if (user) {
            const failed = user.failedLogins + 1;
            const lockMs = lockDurationMs(failed);
            await db.user.update({
              where: { id: user.id },
              data: { failedLogins: failed, lockedUntil: lockMs ? new Date(Date.now() + lockMs) : null },
            });
            await audit("auth.login_failed", { userId: user.id, req, meta: { failed } });
          } else {
            await audit("auth.login_failed", { req, meta: { email } });
          }
          throw new InvalidLogin();
        }

        if (user.blocked) {
          await audit("auth.login_failed", { userId: user.id, req, meta: { reason: "blocked" } });
          throw new BlockedLogin();
        }

        await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
        await audit("auth.login", { userId: user.id, req });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          blocked: user.blocked,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            /// Google vérifie l'adresse e-mail : rattacher le compte Google à
            /// l'utilisateur existant portant cet e-mail est sûr. L'inscription
            /// par Google est bloquée dans le callback `signIn` ci-dessous.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    /// Google : connexion, et inscription d'un nouveau client (e-commerce
    /// classique — pas de parrainage à saisir). Un compte bloqué est refusé.
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      const email = user.email?.toLowerCase();
      if (!email) return false;
      const existing = await db.user.findUnique({ where: { email }, select: { id: true, blocked: true } });
      if (existing?.blocked) return "/connexion?error=blocked";
      await audit(existing ? "auth.login" : "auth.register", { userId: existing?.id, meta: { provider: "google" } });
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        // Première émission : connexion par mot de passe ou Google. Pour
        // Google, `user` vient de l'adaptateur et ne porte pas nos champs :
        // on recharge depuis la base.
        const fresh = await db.user.findUnique({ where: { id: user.id! }, select: sessionSelect });
        if (!fresh) return token;
        token.id = fresh.id;
        token.role = fresh.role;
        token.blocked = fresh.blocked;
        token.name = fresh.name;
        token.picture = fresh.image;
        token.checkedAt = Date.now();
        return token;
      }
      // Un JWT est sans état : un compte bloqué ou rétrogradé garderait ses
      // droits jusqu'à expiration. On resynchronise rôle et blocage depuis
      // la base toutes les 5 minutes — compromis entre coût et réactivité.
      if (token.id && Date.now() - (token.checkedAt ?? 0) > 5 * 60 * 1000) {
        const fresh = await db.user.findUnique({ where: { id: token.id }, select: sessionSelect });
        if (!fresh || fresh.blocked) {
          token.blocked = true;
        } else {
          token.role = fresh.role;
          token.blocked = false;
          token.name = fresh.name;
          token.picture = fresh.image;
        }
        token.checkedAt = Date.now();
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.blocked = token.blocked;
      return session;
    },
  },
  events: {
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      if (token?.id) await audit("auth.logout", { userId: token.id });
    },
  },
});
