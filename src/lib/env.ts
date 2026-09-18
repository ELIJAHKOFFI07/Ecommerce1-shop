import { z } from "zod";

/// Validation des variables d'environnement au démarrage.
///
/// Secure by design : un secret manquant ou trop court fait échouer le
/// démarrage plutôt que de laisser tourner l'app avec une valeur vide ou
/// par défaut. `AUTH_SECRET` signe les sessions — 32 octets minimum.
///
/// Les valeurs ne sont JAMAIS écrites en dur ici : tout vient de
/// `process.env` (fichier .env en local, variables Vercel en production).
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET doit faire au moins 32 caractères"),
  AUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  IMAGEKIT_PUBLIC_KEY: z.string().optional(),
  IMAGEKIT_PRIVATE_KEY: z.string().optional(),
  IMAGEKIT_FOLDER: z.string().default("DreamShop"),
  GMAIL_USER: z.string().email().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

/// Lecture paresseuse : le build Next évalue les modules sans variables ;
/// on ne valide qu'au premier appel réel, côté serveur.
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Variables d'environnement invalides :\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const isProd = () => process.env.NODE_ENV === "production";
