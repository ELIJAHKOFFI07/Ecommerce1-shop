"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { useSession } from "@/lib/session";
import { uploadImage } from "@/lib/storage";
import { HeaderSkeleton, Skeleton } from "@/components/Skeleton";
import { PushToggle } from "@/components/play/PushToggle";

export default function EditProfilePage() {
  const router = useRouter();
  const { profile, loading, refresh } = useSession();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!profile) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFullName(profile.full_name ?? "");
    setUsername(profile.username ?? "");
    setPhone(profile.phone ?? "");
    setWhatsapp(profile.whatsapp ?? "");
    setCity(profile.city ?? "");
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.avatar_url ?? null);
  }, [profile]);

  // Valeur dérivée plutôt que state : évite un rendu en cascade. L'effet ne
  // sert qu'à libérer l'URL d'objet, sinon le fichier reste en mémoire.
  const preview = useMemo(
    () => (avatarFile ? URL.createObjectURL(avatarFile) : null),
    [avatarFile],
  );
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      let nextAvatar = avatarUrl;
      if (avatarFile) {
        nextAvatar = await uploadImage("avatars", profile.id, avatarFile);
      }
      // Seules ces colonnes sont accessibles au client : schema.sql fait
      // `grant update (username, full_name, avatar_url, phone, city, bio,
      // fcm_token)`. Les points, is_admin et is_seller sont hors de portée.
      const { error: updErr } = await createClient()
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          username: username.trim(),
          phone: phone.trim() || null,
          whatsapp: whatsapp.trim() || null,
          city: city.trim() || null,
          bio: bio.trim() || null,
          avatar_url: nextAvatar,
        })
        .eq("id", profile.id);
      if (updErr) throw updErr;

      setAvatarFile(null);
      setAvatarUrl(nextAvatar);
      setSuccess(true);
      await refresh();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  function removeAvatar() {
    setAvatarFile(null);
    setAvatarUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <HeaderSkeleton />
        <Skeleton className="mx-auto h-24 w-24 rounded-full" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-lg font-bold">Connexion requise</p>
        <Link
          href="/play/login"
          className="card-hard-sm mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-2.5 font-display text-sm font-bold text-background transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  const field =
    "w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm font-semibold text-foreground outline-none placeholder:text-foreground/40 focus:border-primary";
  const label = "mb-1 block text-sm font-bold text-foreground/70";
  const shown = preview ?? avatarUrl;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/play/account"
        className="card-hard-sm inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 font-display text-xs font-bold text-foreground transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-surface-2 hover:shadow-none"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.5} /> Mon compte
      </Link>

      <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight lg:text-3xl">
        Modifier mon profil
      </h1>

      <form
        onSubmit={save}
        className="card-hard mt-6 rounded-2xl bg-card p-5 sm:p-8"
      >
        {/* ---- Photo de profil ---- */}
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border-2 border-border bg-surface-2 shadow-hard"
            aria-label="Changer la photo de profil"
          >
            {shown ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shown}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-display text-4xl font-extrabold text-primary">
                {(fullName || username || "?")[0]?.toUpperCase()}
              </span>
            )}
            <span className="absolute -bottom-1 -right-1 grid h-10 w-10 place-items-center rounded-full border-2 border-border bg-foreground text-background">
              <Camera className="h-4 w-4" strokeWidth={2.5} />
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />

          <div className="flex flex-1 flex-col items-center gap-3 text-center sm:items-start sm:text-left">
            <div>
              <p className="font-display text-base font-bold text-foreground">
                Photo de profil
              </p>
              <p className="mt-0.5 text-xs font-semibold text-foreground/60">
                JPG ou PNG · 5 Mo max. Elle apparaît sur vos annonces et vos
                messages.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="card-hard-sm inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 font-display text-sm font-bold text-background transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              >
                <Camera className="h-4 w-4" strokeWidth={2.5} />
                Changer la photo
              </button>
              {shown && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="card-hard-sm inline-flex items-center justify-center gap-2 rounded-full bg-card px-5 py-2.5 font-display text-sm font-bold text-foreground transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-surface-2 hover:text-red-600 hover:shadow-none"
                >
                  Retirer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ---- Champs en deux colonnes ---- */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Nom complet</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Votre nom"
              className={field}
            />
          </label>

          <label className="block">
            <span className={label}>Pseudo (visible publiquement)</span>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="pseudo"
              className={field}
            />
          </label>

          <label className="block">
            <span className={label}>Téléphone</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07 00 00 00 00"
              className={field}
            />
          </label>

          <label className="block">
            <span className={label}>WhatsApp</span>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+225 07 00 00 00 00"
              className={field}
            />
          </label>

          <label className="block">
            <span className={label}>Ville</span>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Abidjan"
              className={field}
            />
          </label>

          <label className="block sm:col-span-2">
            <span className={label}>Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Quelques mots sur vous"
              className={field}
            />
          </label>

          <div className="sm:col-span-2">
            <PushToggle />
          </div>

          {error && (
            <p className="text-sm font-semibold text-red-600 sm:col-span-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm font-semibold text-vert-deep sm:col-span-2">
              Profil mis à jour.
            </p>
          )}

          <button
            disabled={saving}
            className="card-hard-sm w-full rounded-full bg-foreground py-3 font-display text-sm font-bold text-background transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 sm:col-span-2"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
