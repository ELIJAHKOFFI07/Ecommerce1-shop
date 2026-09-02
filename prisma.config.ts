import { defineConfig } from "prisma/config";

/// Prisma 7 : la connexion utilisée par `prisma migrate`/`prisma studio`
/// vient d'ici, pas du schéma. L'exécution runtime (PrismaClient dans
/// l'app) est configurée séparément dans src/lib/db.ts via l'adaptateur
/// pilote — les deux doivent pointer vers la même DATABASE_URL.
///
/// On lit `process.env` directement plutôt que le helper `env()` de
/// prisma/config : ce dernier LÈVE une exception si la variable est absente,
/// ce qui faisait échouer `prisma generate` au build sur Vercel — or la
/// génération du client n'a besoin d'aucune connexion, seulement du schéma.
/// Les commandes qui se connectent vraiment (`migrate`, `db execute`)
/// échouent d'elles-mêmes avec un message clair si l'URL est vide.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
