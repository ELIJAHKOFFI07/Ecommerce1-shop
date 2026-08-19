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
          className="card-hard-sm mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 font-display text-sm font-bold text-cream transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  const field =
    "w-full rounded-xl border-2 border-border bg-cream px-4 py-3 text-sm font-semibold text-ink outline-none placeholder:text-ink/40 focus:border-orange";
  const label = "mb-1 block text-sm font-bold text-ink/70";
  const shown = preview ?? avatarUrl;

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/play/account"
        className="card-hard-sm inline-flex items-center gap-1.5 rounded-full bg-paper px-3.5 py-2 font-display text-xs font-bold text-ink transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-orange-soft hover:shadow-none"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.5} /> Mon compte
      </Link>

      <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight lg:text-3xl">
        Modifier mon profil
      </h1>

      <form
        onSubmit={save}
        className="card-hard mt-6 space-y-4 rounded-2xl bg-paper p-5 sm:p-6"
      >
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-border bg-orange-soft"
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
              <span className="flex h-full w-full items-center justify-center font-display text-3xl font-extrabold text-orange">
                {(fullName || username || "?")[0]?.toUpperCase()}
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/60 py-1 text-[10px] font-semibold text-white">
              <Camera className="h-3 w-3" /> Modifier
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </div>

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

        <label className="block">
          <span className={label}>Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Quelques mots sur vous"
            className={field}
          />
        </label>

        <PushToggle />

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        {success && (
          <p className="text-sm font-semibold text-vert-deep">
            Profil mis à jour.
          </p>
        )}

        <button
          disabled={saving}
          className="card-hard-sm w-full rounded-full bg-ink py-3 font-display text-sm font-bold text-cream transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
