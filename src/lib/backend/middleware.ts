import { NextResponse, type NextRequest } from "next/server";
import { updateSession as updateSupabaseSession } from "@/lib/supabase/middleware";
import { getBackendProvider } from "./config";

/**
 * Rafraîchissement de session + garde /admin, délégués au backend actif.
 * L'équivalent Parse est prêt dans backend-parse-wip/lib-parse/middleware.ts.
 */
export async function updateSession(request: NextRequest) {
  if (getBackendProvider() === "parse") {
    // Backend Parse pas encore actif : on laisse passer plutôt que de bloquer
    // toute l'application sur une erreur de middleware.
    return NextResponse.next({ request });
  }
  return await updateSupabaseSession(request);
}
