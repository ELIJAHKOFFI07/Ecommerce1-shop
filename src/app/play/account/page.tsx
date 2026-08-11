"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, UserPen } from "lucide-react";
import { ROLE_LABELS, roleOf } from "@/lib/roles";
import { SECTIONS, visibleLinks } from "@/lib/nav";
import { createClient } from "@/lib/backend/client";
import { PointsCard } from "@/components/play/PointsCard";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import type { Profile } from "@/lib/types";
import { ListSkeleton, Skeleton } from "@/components/Skeleton";

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      setEmail(userData.user.email ?? "");
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .maybeSingle();
      setProfile(data as Profile | null);
    })();
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    // Retour a l'espace visiteur : la vitrine reste consultable sans compte.
    router.push("/");
  }

  async function refreshProfile() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .maybeSingle();
    setProfile(data as Profile | null);
  }

  // Tant que l'état d'authentification n'est pas connu, on affiche les
  // shimmers : sans ce garde, la page rendait l'en-tête de profil avec des
  // valeurs par défaut (« Utilisateur », 0 point) avant de se corriger.
  if (authed === null) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-52 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-14 w-full rounded-xl" />
        <ListSkeleton count={6} />
      </div>
    );
  }

  if (authed === false) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium">Connexion requise</p>
        <Link
          href="/play/login"
          className="mt-4 inline-block rounded-full bg-accent px-6 py-2.5 font-semibold text-on-accent"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  const canSell = Boolean(profile?.is_seller || profile?.is_admin);

  return (
    // Deux colonnes dès `lg` : la carte d'identité reste visible pendant que
    // l'on parcourt les rubriques. En colonne unique, la page n'occupait que
    // 512 px au centre d'un écran de bureau.
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr] lg:items-start">
      <aside className="space-y-4 lg:sticky lg:top-20">
        <div className="rounded-2xl border border-border bg-surface p-5 text-center">
          <div className="mx-auto h-20 w-20 overflow-hidden rounded-full bg-accent/15">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-accent">
                {(profile?.full_name ?? profile?.username ?? "?")[0]?.toUpperCase()}
              </span>
            )}
          </div>

          <p className="mt-3 truncate text-lg font-bold">
            {profile?.full_name ?? profile?.username ?? "Utilisateur"}
          </p>
          <p className="truncate text-sm text-muted">{email}</p>
          <p className="mt-1 text-sm text-accent">
            {ROLE_LABELS[roleOf(profile) ?? "user"]} ·{" "}
            {profile?.loyalty_points ?? 0} points
          </p>

          <Link
            href="/play/account/edit"
            className="press mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border py-2.5 text-sm font-semibold transition-colors hover:border-accent hover:text-accent"
          >
            <UserPen className="h-4 w-4" />
            Modifier mon profil
          </Link>
        </div>

        <PointsCard
          points={profile?.loyalty_points ?? 0}
          onRedeemed={refreshProfile}
        />

        <ThemeSwitcher />

        <button
          onClick={signOut}
          className="press flex w-full items-center justify-center gap-2 rounded-full border border-border py-3 font-semibold transition-colors hover:border-red-500 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" /> Se déconnecter
        </button>
      </aside>

      {/* Même source que le menu de navigation (src/lib/nav.ts) : une entrée
          ajoutée là apparaît automatiquement aux deux endroits. */}
      <div className="space-y-8">
        {SECTIONS.map((section) => {
          const links = visibleLinks(section.links, {
            canSell,
            isAdmin: profile?.is_admin ?? false,
          }).filter((l) => l.href !== "/play/account/edit");
          if (links.length === 0) return null;
          return (
            <section key={section.title}>
              <h2 className="mb-3 text-xs uppercase tracking-wide text-muted">
                {section.title}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {links.map(({ href, label, icon: Icon }) => (
                  <AccountLink
                    key={`${section.title}-${href}`}
                    href={href}
                    icon={<Icon />}
                    label={label}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function AccountLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="lift press flex items-center gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent/50"
    >
      <span className="text-accent">{icon}</span>
      {label}
    </Link>
  );
}
