"use client";

import Parse from "parse";
import { ensureParseInitialized, isParseConfigured } from "./init";

export { isParseConfigured };

type AuthUser = Parse.User;

type AuthResult = { data: { user: AuthUser | null }; error: Error | null };

/**
 * Pose le cookie httpOnly `parseSessionToken` côté serveur à partir du
 * sessionToken obtenu après un login/signUp Parse côté navigateur.
 * Remplace la gestion automatique des cookies de @supabase/ssr.
 */
async function syncSessionCookie(sessionToken: string | null) {
  await fetch("/api/auth/session", {
    method: sessionToken ? "POST" : "DELETE",
    headers: { "Content-Type": "application/json" },
    body: sessionToken ? JSON.stringify({ sessionToken }) : undefined,
  });
}

/**
 * Client navigateur Parse. Expose une surface proche de l'ancien client
 * Supabase (`auth.signInWithPassword`, `auth.getUser`, ...) pour limiter le
 * diff dans les pages ; les accès aux données passent par des Cloud
 * Functions ou `Parse.Query` directement (voir src/lib/parse/queries).
 */
export function createClient() {
  const parse = ensureParseInitialized();

  return {
    Parse: parse,
    auth: {
      async signInWithPassword({
        email,
        password,
      }: {
        email: string;
        password: string;
      }): Promise<AuthResult> {
        try {
          const user = await parse.User.logIn(email, password);
          await syncSessionCookie(user.getSessionToken() ?? null);
          return { data: { user }, error: null };
        } catch (err) {
          return { data: { user: null }, error: err as Error };
        }
      },

      async signUp({
        email,
        password,
        fullName,
      }: {
        email: string;
        password: string;
        fullName?: string;
      }): Promise<AuthResult> {
        try {
          const user = new parse.User();
          user.set("username", email);
          user.set("email", email);
          user.set("password", password);
          if (fullName) user.set("fullName", fullName);
          await user.signUp();
          await syncSessionCookie(user.getSessionToken() ?? null);
          return { data: { user }, error: null };
        } catch (err) {
          return { data: { user: null }, error: err as Error };
        }
      },

      /**
       * Remplace supabase.auth.signInWithOAuth({ provider: "google" }).
       * `googleIdToken` provient de Google Identity Services côté navigateur
       * (voir @react-oauth/google dans la page /play/login).
       */
      async signInWithGoogle(googleIdToken: string): Promise<AuthResult> {
        try {
          const user = await parse.User.logInWith("google", {
            authData: { id_token: googleIdToken },
          } as unknown as Parse.AuthData);
          await syncSessionCookie(user.getSessionToken() ?? null);
          return { data: { user }, error: null };
        } catch (err) {
          return { data: { user: null }, error: err as Error };
        }
      },

      async signOut(): Promise<{ error: Error | null }> {
        try {
          await parse.User.logOut();
          await syncSessionCookie(null);
          return { error: null };
        } catch (err) {
          return { error: err as Error };
        }
      },

      async getUser(): Promise<AuthResult> {
        const user = parse.User.current();
        if (!user) return { data: { user: null }, error: null };
        try {
          // Vérifie que la session est toujours valide côté serveur.
          await user.fetch();
          return { data: { user }, error: null };
        } catch (err) {
          return { data: { user: null }, error: err as Error };
        }
      },
    },
  };
}
