import { PrismaClient } from "../../prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

/// Client Prisma unique. Sur Vercel chaque fonction démarre à froid, mais en
/// dev le rechargement à chaud recréerait un client par sauvegarde et
/// épuiserait les connexions Postgres — d'où le cache sur globalThis.
///
/// Prisma 7 exige un adaptateur pilote : `@prisma/adapter-pg` parle
/// directement à Postgres, sans moteur binaire à embarquer.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function create() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? create();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/// Options par défaut des transactions métier. Le délai par défaut (5 s)
/// est trop court quand plusieurs validations se disputent les mêmes lignes
/// avec FOR UPDATE ; une transaction qui expire annule un mouvement de
/// stock à moitié écrit.
export const TX = { timeout: 15_000, maxWait: 10_000 } as const;

export type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];
