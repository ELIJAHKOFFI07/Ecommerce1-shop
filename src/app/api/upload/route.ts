import { withApi, ok, ApiError } from "@/lib/apiError";
import { requireUser, requireStaff } from "@/lib/requireAuth";
import { uploadFile, type UploadKind } from "@/lib/storage";
import { consumeRateLimit } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";

/// Envoi de fichier. Le `kind` décide des droits : un membre envoie des
/// reçus et son avatar ; produits, preuves et logo sont réservés au staff.
const MEMBER_KINDS: UploadKind[] = ["avatar"];
const STAFF_KINDS: UploadKind[] = ["product", "category", "logo"];

export const POST = withApi(async (req) => {
  const me = await requireUser();
  await consumeRateLimit("upload", me.id);

  const form = await req.formData();
  const kind = String(form.get("kind") ?? "");
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Aucun fichier reçu.");

  if (STAFF_KINDS.includes(kind as UploadKind)) await requireStaff();
  else if (!MEMBER_KINDS.includes(kind as UploadKind)) throw new ApiError(400, "Type d'envoi inconnu.");

  const res = await uploadFile(file, kind as UploadKind);
  await audit("upload", { userId: me.id, req, meta: { kind, size: file.size } });
  return ok(res, 201);
});
