import { PrismaClient } from "../../prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

/// Client Prisma unique. Sur Vercel chaque fonction démarre à froid, mais en
/// dev le rechargement à chaud recréerait un client par sauvegarde et
/// épuiserait les connexions Postgres — d'où le cache sur globalThis.
///
/// Prisma 7 exige un adaptateur pilote : `@prisma/adapter-pg` parle
/// directement à Postgres, sans moteur binaire à embarquer.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/// TLS vers le VPS : le certificat Postgres est auto-signé (docs/VPS.md §1).
/// Le pilote `pg` traite `sslmode=require` comme une vérification stricte
/// de l'autorité et refuse ce certificat. On demande donc explicitement
/// « chiffré, sans vérifier l'émetteur » : la connexion est protégée contre
/// l'écoute passive, ce qui est l'objectif ; l'authentification du serveur
/// repose sur le mot de passe SCRAM. Pour une vérification complète,
/// installez le certificat côté client et passez `sslmode=verify-full`.
function connection() {
  const raw = process.env.DATABASE_URL ?? "";
  try {
    const url = new URL(raw);
    const mode = url.searchParams.get("sslmode");
    if (mode === "require" || mode === "prefer") {
      url.searchParams.delete("sslmode");
      return { connectionString: url.toString(), ssl: { rejectUnauthorized: false } };
    }
  } catch {
    /* URL vide au build : Prisma lèvera au premier appel réel */
  }
  return { connectionString: raw };
}

function create() {
  return new PrismaClient({ adapter: new PrismaPg(connection()) });
}

export const db = globalForPrisma.prisma ?? create();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/// Options par défaut des transactions métier. Le délai par défaut (5 s)
/// est trop court quand plusieurs validations se disputent les mêmes lignes
/// avec FOR UPDATE ; une transaction qui expire annule un mouvement de
/// stock à moitié écrit.
export const TX = { timeout: 15_000, maxWait: 10_000 } as const;

export type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];
