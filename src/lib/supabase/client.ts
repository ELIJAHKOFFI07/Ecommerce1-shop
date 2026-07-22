import { createBrowserClient } from "@supabase/ssr";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase non configuré : remplissez secrets.local.ps1 et lancez " +
        "SETUP_SERVICES.ps1 (voir VARIABLES_A_REMPLIR.md), puis relancez le serveur.",
    );
  }
  return createBrowserClient(url, anonKey);
}
