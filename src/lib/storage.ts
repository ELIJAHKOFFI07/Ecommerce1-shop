import { createClient } from "@/lib/backend/client";

/// Supabase Storage n'accepte que des clés simples : un fichier nommé
/// « photo téléphone (1).jpg » est rejeté (accents, espaces, parenthèses).
/// C'est la cause la plus fréquente d'un upload qui échoue sans raison
/// apparente côté utilisateur.
export function sanitizeFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const rawBase = dot > 0 ? name.slice(0, dot) : name;
  const rawExt = dot > 0 ? name.slice(dot + 1) : "";

  const base = rawBase
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // supprime les accents (diacritiques)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .toLowerCase();

  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  return `${base || "image"}.${ext || "jpg"}`;
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/// Téléverse une image et renvoie son URL publique.
/// Le chemin commence par l'identifiant de l'utilisateur : c'est ce
/// qu'exige la policy `storage_own_write`
/// (`(storage.foldername(name))[1] = auth.uid()::text`).
export async function uploadImage(
  bucket: "product-images" | "shop-images" | "avatars",
  userId: string,
  file: File,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`« ${file.name} » n'est pas une image.`);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(
      `« ${file.name} » dépasse 5 Mo (${(file.size / 1024 / 1024).toFixed(1)} Mo).`,
    );
  }

  const supabase = createClient();
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${userId}/${unique}-${sanitizeFileName(file.name)}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    throw new Error(`Échec de l'envoi de « ${file.name} » : ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
