import { AccountDashboardNav } from "@/components/play/AccountDashboardNav";
import { createClient } from "@/lib/backend/server";

/// Layout du dashboard compte : barre de navigation horizontale partagée par
/// toutes les pages de l'espace personnel. Le rôle est résolu côté serveur
/// (même principe que le layout `/play`) pour filtrer les liens sans
/// clignotement côté navigateur.
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { is_seller: boolean | null; is_admin: boolean | null } | null =
    null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("is_seller, is_admin")
      .eq("id", user.id)
      .maybeSingle();
    profile = data;
  }

  return (
    <div className="mx-auto w-full max-w-7xl pb-10 2xl:max-w-[1440px]">
      <AccountDashboardNav
        canSell={Boolean(profile?.is_seller || profile?.is_admin)}
        isAdmin={Boolean(profile?.is_admin)}
      />
      <div className="mt-6">{children}</div>
    </div>
  );
}