"use client";

/// Upload d'image, appelé depuis les composants client. Même signature que
/// l'ancienne version Supabase (bucket, userId, file) pour ne pas toucher
/// aux 6 composants qui l'appellent — seule l'implémentation change.
///
/// Avant : upload direct navigateur → Supabase Storage. Maintenant : le
/// fichier passe par /api/upload, qui le relaie vers ImageKit côté serveur
/// (src/lib/storage.ts — clé privée ImageKit, jamais exposée au navigateur).
///
/// `userId` n'est plus utilisé pour construire le chemin (l'appartenance
/// est vérifiée par la route via la session, pas par une convention de
/// nommage de fichier) — gardé dans la signature uniquement pour ne pas
/// casser les appelants existants.
const BUCKET_TO_SUBFOLDER: Record<string, string> = {
  "product-images": "products",
  "shop-images": "shops",
  avatars: "avatars",
};

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function uploadImage(
  bucket: "product-images" | "shop-images" | "avatars",
  _userId: string,
  file: File,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`« ${file.name} » n'est pas une image.`);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(
      `« ${file.name} » dépasse ${(MAX_IMAGE_BYTES / 1024 / 1024).toFixed(0)} Mo (${(file.size / 1024 / 1024).toFixed(1)} Mo).`,
    );
  }

  const form = new FormData();
  form.append("file", file);
  form.append("subFolder", BUCKET_TO_SUBFOLDER[bucket] ?? "products");

  const response = await fetch("/api/upload", { method: "POST", body: form });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error ?? `Échec de l'envoi de « ${file.name} ».`);
  }
  return result.url as string;
}
