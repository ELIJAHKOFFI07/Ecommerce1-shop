import { ImageKit } from "@imagekit/nodejs";

/// Stockage fichiers — remplace le Storage Supabase. Tout est rangé sous
/// IMAGEKIT_FOLDER (dossier "DreamShop" par défaut), avec un sous-dossier
/// par type de contenu pour ne pas tout mélanger dans un seul répertoire.
const client = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

export function isStorageConfigured(): boolean {
  return Boolean(process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_URL_ENDPOINT);
}

/// Assainit un nom de fichier : ImageKit remplace déjà les caractères hors
/// alphanumérique/./- par des underscores côté serveur, mais on le fait
/// nous-mêmes en amont pour garder un nom prévisible dans les logs et éviter
/// de dépendre de ce détail d'implémentation.
function sanitizeFileName(name: string): string {
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const base = name.slice(0, name.length - ext.length);
  const safeBase = base.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 80) || "fichier";
  return `${Date.now()}-${safeBase}${ext}`;
}

/**
 * Envoie un fichier vers ImageKit, sous IMAGEKIT_FOLDER/subFolder.
 *
 * @param file  Le fichier reçu d'un `request.formData()` de Route Handler —
 *              c'est directement un objet `File` de l'API Web, accepté tel
 *              quel par le SDK ImageKit (pas de conversion en Buffer).
 * @param subFolder  "products", "shops", "categories"… — un sous-dossier
 *              par type de contenu, pour retrouver facilement dans la
 *              médiathèque ImageKit.
 */
export async function uploadFile(file: File, subFolder: string) {
  if (!isStorageConfigured()) {
    throw new Error(
      "IMAGEKIT_PRIVATE_KEY / IMAGEKIT_URL_ENDPOINT manquants — voir .env.example.",
    );
  }

  const baseFolder = process.env.IMAGEKIT_FOLDER || "DreamShop";
  const result = await client.files.upload({
    file,
    fileName: sanitizeFileName(file.name || "fichier"),
    folder: `/${baseFolder}/${subFolder}`,
    useUniqueFileName: true,
  });

  if (!result.url || !result.fileId) {
    throw new Error("Échec de l'upload ImageKit : réponse incomplète.");
  }

  return { url: result.url, fileId: result.fileId };
}

/// Supprime un fichier — utile quand un produit/une image est remplacé(e)
/// ou supprimé(e), pour ne pas laisser trainer des fichiers orphelins dans
/// la médiathèque.
export async function deleteFile(fileId: string) {
  await client.files.delete(fileId);
}
