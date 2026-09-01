import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/// Client Prisma singleton, via l'adaptateur pilote `pg` (Prisma 7 : plus de
/// moteur binaire séparé, la connexion passe directement par le driver
/// Node `pg`). En dev, Next.js recharge les modules à chaud à chaque
/// changement de fichier — sans ce cache sur `globalThis`, chaque
/// rechargement recréerait un pool de connexions, épuisant Postgres en
/// quelques minutes de travail.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
