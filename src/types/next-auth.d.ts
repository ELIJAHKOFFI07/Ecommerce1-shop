import type { DefaultSession } from "next-auth";

/// Étend les types Auth.js avec les champs qu'on pose dans les callbacks
/// jwt/session (src/lib/auth.ts) — sans ce fichier, isAdmin/isSeller
/// n'existent pas sur session.user du point de vue de TypeScript.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
      isSeller: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isAdmin?: boolean;
    isSeller?: boolean;
  }
}
