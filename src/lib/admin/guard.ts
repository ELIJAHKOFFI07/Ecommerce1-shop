import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/backend/server";

/// Client à pouvoirs étendus (service_role) : il contourne les RLS et peut
/// agir sur auth.users (créer, supprimer, changer un mot de passe).
///
/// ⚠️ Ne doit JAMAIS être importé depuis un composant client. La clé n'est
/// pas préfixée NEXT_PUBLIC_, donc elle reste absente du bundle navigateur.
export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquant : ajoutez-la dans .env.local et " +
        "dans les variables d'environnement Vercel (voir DEPLOIEMENT_VERCEL.md).",
    );
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type AdminCheck =
  | { ok: true; adminId: string }
  | { ok: false; status: number; message: string };

/// Vérifie que l'appelant est bien un administrateur connecté.
///
/// Le contrôle se fait à partir des cookies de session, jamais d'un
/// identifiant envoyé par le client : sans cela, n'importe qui pourrait
/// appeler ces routes en se déclarant admin.
export async function requireAdmin(): Promise<AdminCheck> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, message: "Non connecté" };
  }

  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!(data as { is_admin: boolean } | null)?.is_admin) {
    return { ok: false, status: 403, message: "Réservé aux administrateurs" };
  }

  return { ok: true, adminId: user.id };
}

/// Mot de passe temporaire lisible, à communiquer à l'utilisateur.
/// Il devra en choisir un autre à la connexion suivante
/// (profiles.must_change_password, migration 008).
export function generateTempPassword(): string {
  // Alphabet sans caractères ambigus (0/O, 1/l/I) pour éviter les erreurs
  // de saisie quand le mot de passe est dicté ou recopié.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const body = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `DTS-${body}`;
}
