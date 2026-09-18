import ImageKit from "@imagekit/nodejs";
import { randomBytes } from "node:crypto";
import { ApiError } from "./apiError";

/// Stockage des fichiers sur ImageKit (Vercel n'a pas de disque durable).
///
/// Sécurité des envois :
///  - le type est vérifié par SIGNATURE BINAIRE (magic bytes), pas par
///    l'extension ni par le Content-Type déclaré, tous deux falsifiables ;
///  - taille plafonnée ;
///  - nom de fichier régénéré aléatoirement : le nom d'origine n'est jamais
///    réutilisé (traversée de chemin, caractères spéciaux, fuite d'info).

export type UploadKind = "product" | "category" | "avatar" | "logo";

const LIMITS: Record<UploadKind, { maxBytes: number; kinds: readonly string[] }> = {
  product: { maxBytes: 5 * 1024 * 1024, kinds: ["image/jpeg", "image/png", "image/webp"] },
  avatar: { maxBytes: 2 * 1024 * 1024, kinds: ["image/jpeg", "image/png", "image/webp"] },
  logo: { maxBytes: 2 * 1024 * 1024, kinds: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"] },
  category: { maxBytes: 3 * 1024 * 1024, kinds: ["image/jpeg", "image/png", "image/webp"] },
};

/// Détection du type réel par les premiers octets.
function sniff(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buf.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  const head = buf.subarray(0, 256).toString("utf8").trimStart().toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) return "image/svg+xml";
  return null;
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
};

let _client: ImageKit | null = null;
function client(): ImageKit {
  if (_client) return _client;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) throw new ApiError(503, "Le stockage de fichiers n'est pas configuré.");
  _client = new ImageKit({ privateKey });
  return _client;
}

export const isStorageConfigured = () => Boolean(process.env.IMAGEKIT_PRIVATE_KEY);

export async function uploadFile(file: File, kind: UploadKind): Promise<{ url: string; fileId: string }> {
  const rule = LIMITS[kind];
  if (file.size > rule.maxBytes) {
    throw new ApiError(413, `Fichier trop lourd (maximum ${Math.round(rule.maxBytes / 1024 / 1024)} Mo).`);
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type || !rule.kinds.includes(type)) {
    throw new ApiError(415, "Format non accepté. Envoyez une image JPG, PNG ou WebP" + (rule.kinds.includes("application/pdf") ? " ou un PDF." : "."));
  }
  // SVG : on refuse tout script embarqué (XSS via image).
  if (type === "image/svg+xml" && /<script|on\w+=|javascript:/i.test(buf.toString("utf8"))) {
    throw new ApiError(415, "Ce SVG contient du code et a été refusé.");
  }
  const name = `${Date.now()}-${randomBytes(8).toString("hex")}.${EXT[type]}`;
  const folder = `/${process.env.IMAGEKIT_FOLDER ?? "DreamShop"}/${kind}`;
  const res = await client().files.upload({
    file: buf.toString("base64"),
    fileName: name,
    folder,
    useUniqueFileName: false,
    isPrivateFile: false,
  });
  if (!res.url || !res.fileId) throw new ApiError(502, "L'envoi du fichier a échoué.");
  return { url: res.url, fileId: res.fileId };
}
