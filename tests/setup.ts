import "dotenv/config";
import { config } from "dotenv";

/// Les tests lisent .env.local (tunnel SSH vers la base du VPS) s'il
/// existe. Ceux qui touchent la base se sautent d'eux-mêmes sans
/// DATABASE_URL joignable.
config({ path: ".env.local", override: true });
process.env.NODE_ENV = "test";
process.env.AUTH_SECRET ??= "x".repeat(40);
