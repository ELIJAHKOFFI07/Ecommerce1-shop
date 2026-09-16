import "dotenv/config";
import { defineConfig } from "prisma/config";

/// Prisma 7 lit l'URL ici, plus dans le schéma. `process.env` plutôt que
/// l'assistant `env()` : ce dernier lève dès que la variable manque, ce qui
/// casse `prisma generate` sur Vercel au moment de l'installation, avant
/// que les variables d'environnement ne soient injectées.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
