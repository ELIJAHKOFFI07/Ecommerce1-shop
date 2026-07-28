import "server-only";
import Parse from "parse/node";
import { NextResponse, type NextRequest } from "next/server";
import { isParseConfigured } from "./init";
import { SESSION_COOKIE } from "./server";

let initialized = false;
function ensureServerInit() {
  if (initialized) return;
  Parse.initialize(
    process.env.NEXT_PUBLIC_PARSE_APP_ID as string,
    process.env.NEXT_PUBLIC_PARSE_JS_KEY,
    process.env.PARSE_MASTER_KEY,
  );
  Parse.serverURL = process.env.NEXT_PUBLIC_PARSE_SERVER_URL as string;
  initialized = true;
}

/**
 * Garde d'accès /admin, équivalent à la vérification `profiles.is_admin`
 * faite dans src/lib/supabase/middleware.ts. Revalide toujours côté serveur
 * avec la master key plutôt que de faire confiance au cookie seul : le
 * contrôle réel est doublé par le rôle Parse "admin" dans les ACL/Cloud
 * Functions (voir src/proxy.ts et parse-server/cloud/main.js).
 */
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  // Parse pas encore configuré (voir PARSE_SETUP.md) : on laisse passer la
  // requête plutôt que de planter sur chaque page.
  if (!isParseConfigured()) return response;

  if (!request.nextUrl.pathname.startsWith("/admin")) return response;

  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return NextResponse.redirect(new URL("/play/login", request.url));
  }

  ensureServerInit();

  try {
    const user = await Parse.User.become(sessionToken);
    const isAdmin = await Parse.Cloud.run(
      "isAdmin",
      { userId: user.id },
      { useMasterKey: true },
    );
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/play", request.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/play/login", request.url));
  }

  return response;
}
