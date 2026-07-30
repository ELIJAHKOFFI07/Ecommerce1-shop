import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/backend/server";

/// Point de retour après une connexion via un fournisseur externe (Google).
///
/// Le client navigateur utilise le flux PKCE : Supabase renvoie ici un
/// paramètre `code` qu'il faut échanger contre une session. L'échange est
/// fait côté serveur pour que les cookies de session soient posés avant le
/// premier rendu — sinon les composants serveur (garde /admin, en-tête de la
/// page d'accueil) verraient encore un visiteur non connecté.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Seuls les chemins internes sont acceptés : une URL absolue permettrait
  // de rediriger vers un site tiers depuis un lien piégé.
  const raw = searchParams.get("next") ?? "/play/account";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/play/account";

  // Le fournisseur peut refuser la demande (consentement annulé) : on
  // renvoie vers la connexion avec le motif plutôt qu'une page blanche.
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(
      `${origin}/play/login?error=${encodeURIComponent(providerError)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/play/login`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/play/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
