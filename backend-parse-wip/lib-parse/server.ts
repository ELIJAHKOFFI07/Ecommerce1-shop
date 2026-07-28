import "server-only";
import Parse from "parse/node";
import { cookies } from "next/headers";
import { ensureParseInitialized } from "./init";

const SESSION_COOKIE = "parseSessionToken";

/**
 * Client Server Component. Lit le cookie httpOnly posé par
 * /api/auth/session (voir src/lib/parse/client.ts) et restitue l'utilisateur
 * courant, à la manière de src/lib/supabase/server.ts.
 *
 * Toute vérification d'autorisation stricte (ex. garde /admin) doit
 * revalider côté Cloud Function avec useMasterKey plutôt que de faire
 * confiance à ce user seul — voir src/proxy.ts.
 */
export async function createClient() {
  const parse = ensureParseInitialized();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value ?? null;

  return {
    Parse: parse,
    sessionToken,
    auth: {
      async getUser() {
        if (!sessionToken) return { data: { user: null }, error: null };
        try {
          const user = await parse.User.become(sessionToken);
          return { data: { user }, error: null };
        } catch (err) {
          return { data: { user: null }, error: err as Error };
        }
      },
    },
  };
}

export { SESSION_COOKIE };
