import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

/// Erreur métier portant un code HTTP. Le message est destiné à
/// l'utilisateur : il ne contient jamais de détail technique.
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export const unauthorized = () => new ApiError(401, "Connexion requise.");
export const forbidden = () => new ApiError(403, "Vous n'avez pas les droits pour cette action.");
export const notFound = (what = "Ressource") => new ApiError(404, `${what} introuvable.`);

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/// Enveloppe de toutes les routes API.
///
/// Secure by design : aucune erreur inattendue ne remonte au client. Une
/// exception non prévue est journalisée côté serveur et le client reçoit un
/// 500 générique — pas de pile d'appels, pas de requête SQL, pas de chemin
/// de fichier. Les erreurs Zod deviennent des 400 lisibles.
export function withApi<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      if (err instanceof ZodError) {
        const first = err.issues[0];
        const field = first?.path.join(".");
        const msg = field ? `${field} : ${first?.message}` : first?.message ?? "Données invalides.";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      console.error("[api] erreur non gérée", err);
      return NextResponse.json({ error: "Une erreur est survenue. Réessayez." }, { status: 500 });
    }
  };
}

/// Lecture + validation du corps JSON. Taille plafonnée à 256 Ko : un corps
/// géant sert soit à saturer la mémoire, soit à cacher une charge utile.
const MAX_BODY = 256 * 1024;

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY) throw new ApiError(413, "Requête trop volumineuse.");
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "Corps de requête JSON invalide.");
  }
  return schema.parse(raw);
}

export function parseQuery<T>(req: Request, schema: ZodType<T>): T {
  const url = new URL(req.url);
  const obj: Record<string, string> = {};
  url.searchParams.forEach((v, k) => (obj[k] = v));
  return schema.parse(obj);
}

export const ok = <T>(data: T, status = 200) => NextResponse.json(data, { status });
