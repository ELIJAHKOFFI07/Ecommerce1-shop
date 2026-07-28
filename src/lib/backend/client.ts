import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { getBackendProvider, PARSE_NOT_READY } from "./config";

/**
 * Client navigateur du backend actif.
 *
 * Toutes les pages/composants passent par ici plutôt que d'importer
 * directement @/lib/supabase/client : c'est le seul endroit à modifier le
 * jour où l'on bascule sur Parse Server.
 */
export function createClient() {
  if (getBackendProvider() === "parse") {
    throw new Error(PARSE_NOT_READY);
  }
  return createSupabaseClient();
}

export { isBackendConfigured, getBackendProvider } from "./config";
