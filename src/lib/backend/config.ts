/**
 * Point de bascule unique entre les backends.
 *
 * Aujourd'hui : Supabase (le VPS Parse du client n'est pas encore prêt).
 * Demain : Parse Server auto-hébergé — il suffira de passer
 * NEXT_PUBLIC_BACKEND_PROVIDER à "parse" une fois l'implémentation Parse
 * terminée (voir backend-parse-wip/README.md).
 */
export type BackendProvider = "supabase" | "parse";

export function getBackendProvider(): BackendProvider {
  return process.env.NEXT_PUBLIC_BACKEND_PROVIDER === "parse"
    ? "parse"
    : "supabase";
}

/**
 * Remplace isSupabaseConfigured(). Tant que les clés du backend actif ne sont
 * pas renseignées, les layouts affichent <SetupNotice /> au lieu de planter.
 */
export function isBackendConfigured(): boolean {
  if (getBackendProvider() === "parse") {
    return Boolean(
      process.env.NEXT_PUBLIC_PARSE_APP_ID &&
        process.env.NEXT_PUBLIC_PARSE_SERVER_URL,
    );
  }
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export const PARSE_NOT_READY =
  "Backend Parse sélectionné mais pas encore implémenté : le serveur Parse " +
  "du VPS n'est pas prêt. Repassez NEXT_PUBLIC_BACKEND_PROVIDER à \"supabase\" " +
  "(voir backend-parse-wip/README.md).";
