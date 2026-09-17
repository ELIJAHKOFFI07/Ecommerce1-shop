import { Prisma } from "../../prisma/generated/client";

/// Helpers Decimal — côté serveur uniquement (import du client Prisma).
export const Decimal = Prisma.Decimal;
export const dec = (v: Prisma.Decimal | number | string) => new Prisma.Decimal(v);
