"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { useSession } from "@/lib/session";
import { uploadImage } from "@/lib/storage";
import { HeaderSkeleton, Skeleton } from "@/components/Skeleton";

export default function EditProfilePage() {
  const router = useRouter();
  const { profile, loading, refresh } = useSession();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
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
        <p className="text-lg font-medium">Connexion requise</p>
        <Link
          href="/play/login"
          className="mt-4 inline-block rounded-full bg-gold px-6 py-2.5 font-semibold text-black"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  const field =
    "w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold";
  const shown = preview ?? avatarUrl;

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/play/account"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Mon compte
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Modifier mon profil</h1>

      <form onSubmit={save} className="mt-6 space-y-4">
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative h-24 w-24 overflow-hidden rounded-full border border-border bg-surface-2"
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
              <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-gold">
                {(fullName || username || "?")[0]?.toUpperCase()}
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/60 py-1 text-[10px] text-white">
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
          <span className="mb-1 block text-sm text-muted">Nom complet</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Votre nom"
            className={field}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-muted">
            Pseudo (visible publiquement)
          </span>
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="pseudo"
            className={field}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-muted">Téléphone</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07 00 00 00 00"
            className={field}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-muted">Ville</span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Abidjan"
            className={field}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-muted">Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Quelques mots sur vous"
            className={field}
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && (
          <p className="text-sm text-green-500">Profil mis à jour.</p>
        )}

        <button
          disabled={saving}
          className="w-full rounded-full bg-gold py-3 font-semibold text-black disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
