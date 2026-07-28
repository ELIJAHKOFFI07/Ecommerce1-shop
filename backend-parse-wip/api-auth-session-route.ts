import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/parse/server";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 jours, aligné sur la durée de session Parse par défaut
};

/**
 * Pose le cookie httpOnly contenant le sessionToken Parse après un
 * login/signUp côté navigateur. Remplace la synchro automatique de cookies
 * de @supabase/ssr.
 */
export async function POST(request: NextRequest) {
  const { sessionToken } = (await request.json()) as {
    sessionToken?: string;
  };
  if (!sessionToken) {
    return NextResponse.json({ error: "sessionToken manquant" }, { status: 400 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, sessionToken, COOKIE_OPTIONS);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
