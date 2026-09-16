import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig, MEMBER_PREFIXES, ADMIN_PREFIXES, ADMIN_ROLES } from "@/lib/auth.config";

/// Vérification optimiste à l'entrée : décode le JWT (sans base) et
/// redirige les visiteurs qui n'ont rien à faire là. Chaque route et chaque
/// page revérifient ensuite avec `requireUser`/`requirePermission` — le
/// proxy évite juste d'afficher un écran vide avant la redirection.
const { auth } = NextAuth(authConfig);

export const proxy = auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth as { user?: { id: string; role: string; blocked: boolean } } | null;
  const user = session?.user;

  const needsMember = MEMBER_PREFIXES.some((p) => pathname.startsWith(p));
  const needsAdmin = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));

  if ((needsMember || needsAdmin) && (!user || user.blocked)) {
    const url = new URL("/connexion", req.nextUrl.origin);
    url.searchParams.set("suite", pathname);
    return NextResponse.redirect(url);
  }
  if (needsAdmin && user && !ADMIN_ROLES.has(user.role)) {
    return NextResponse.redirect(new URL("/espace", req.nextUrl.origin));
  }
  // Un membre connecté n'a rien à faire sur les pages de connexion.
  if (user && (pathname === "/connexion" || pathname === "/inscription")) {
    return NextResponse.redirect(new URL("/espace", req.nextUrl.origin));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icons|images|manifest.webmanifest).*)"],
};
