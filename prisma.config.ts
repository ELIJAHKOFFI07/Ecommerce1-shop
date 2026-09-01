import { defineConfig, env } from "prisma/config";

/// Prisma 7 : la connexion utilisée par `prisma migrate`/`prisma studio`
/// vient d'ici, pas du schéma. L'exécution runtime (PrismaClient dans
/// l'app) est configurée séparément dans src/lib/db.ts via l'adaptateur
/// pilote — les deux doivent pointer vers la même DATABASE_URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
