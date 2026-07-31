import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/backend/server";

/// Connexion directe depuis un lien reçu par e-mail.
///
/// Le lien porte un `token_hash` à **usage unique** : Supabase le consomme à
/// la première vérification, un second clic échoue. Il expire par ailleurs
/// selon le délai configuré côté Supabase (Authentication → Email →
/// « Email OTP Expiration », une heure par défaut).
///
/// L'échange se fait ici, côté serveur, pour que les cookies de session
/// soient posés avant le premier rendu : sinon les composants serveur
/// verraient encore un visiteur.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Seuls les chemins internes sont acceptés : une URL absolue permettrait
  // de rediriger vers un site tiers depuis un lien piégé.
  const raw = searchParams.get("next") ?? "/play/notifications";
  const next =
    raw.startsWith("/") && !raw.startsWith("//") ? raw : "/play/notifications";

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/play/login`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    // Jeton déjà utilisé, expiré, ou invalide. On renvoie vers la connexion
    // en conservant la destination : l'utilisateur y arrive après s'être
    // identifié normalement.
    return NextResponse.redirect(
      `${origin}/play/login?next=${encodeURIComponent(next)}` +
        `&error=${encodeURIComponent(
          "Ce lien a déjà été utilisé ou a expiré. Connectez-vous pour continuer.",
        )}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
