import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { getBackendProvider, PARSE_NOT_READY } from "./config";

/**
 * Client Server Component du backend actif (lit les cookies de session).
 * Pendant de src/lib/backend/client.ts côté navigateur.
 */
export async function createClient() {
  if (getBackendProvider() === "parse") {
    throw new Error(PARSE_NOT_READY);
  }
  return await createSupabaseServerClient();
}
