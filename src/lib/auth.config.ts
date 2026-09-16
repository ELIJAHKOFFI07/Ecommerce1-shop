import type { NextAuthConfig } from "next-auth";

/// Partie de la configuration Auth.js sans adaptateur ni fournisseur :
/// importée par le proxy pour décoder le JWT sans charger Prisma.
///
/// Sessions JWT de 12 h, renouvelées à chaque activité (updateAge 1 h).
/// Une session courte limite la fenêtre d'exploitation d'un cookie volé.
export const authConfig = {
  pages: { signIn: "/connexion", error: "/connexion" },
  session: { strategy: "jwt", maxAge: 12 * 60 * 60, updateAge: 60 * 60 },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  trustHost: true,
  providers: [],
} satisfies NextAuthConfig;

/// Préfixes de routes réservés. Le proxy redirige les visiteurs non
/// connectés ; les routes elles-mêmes revérifient rôle et permissions —
/// le proxy est un confort, pas la barrière de sécurité.
export const MEMBER_PREFIXES = ["/espace", "/panier", "/commander"];
export const ADMIN_PREFIXES = ["/admin"];
export const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "STOCK_MANAGER", "SUPPORT"]);
