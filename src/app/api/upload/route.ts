import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireAuth";
import { ApiError, withApiErrors } from "@/lib/apiError";
import { uploadFile } from "@/lib/storage";

const MAX_SIZE = 8 * 1024 * 1024; // 8 Mo
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_SUBFOLDERS = ["products", "shops", "categories", "avatars", "stories"];

/// Upload générique — remplace l'upload direct au Storage Supabase depuis
/// le navigateur. Ici, le fichier passe par le serveur (pas d'upload direct
/// client → ImageKit) : plus simple à sécuriser, la clé privée ImageKit ne
/// quitte jamais le serveur.
///
/// multipart/form-data : champ "file" (le fichier), champ "subFolder"
/// (products/shops/categories/avatars/stories).
export async function POST(request: Request) {
  return withApiErrors(async () => {
    await requireUser();

    const form = await request.formData();
    const file = form.get("file");
    const subFolder = form.get("subFolder");

    if (!(file instanceof File)) throw new ApiError(400, "Fichier manquant");
    if (typeof subFolder !== "string" || !ALLOWED_SUBFOLDERS.includes(subFolder)) {
      throw new ApiError(400, "Dossier de destination invalide");
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new ApiError(400, "Type de fichier non autorisé (jpeg, png, webp, gif uniquement)");
    }
    if (file.size > MAX_SIZE) {
      throw new ApiError(400, "Fichier trop volumineux (8 Mo maximum)");
    }

    const uploaded = await uploadFile(file, subFolder);
    return NextResponse.json(uploaded);
  });
}
