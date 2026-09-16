import bcrypt from "bcryptjs";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/// Coût bcrypt 12 : ~250 ms par hachage sur un cœur moderne. Assez lent pour
/// rendre une attaque hors-ligne coûteuse (quelques hachages/s au lieu de
/// milliards), assez rapide pour ne pas gêner la connexion.
const COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(plain: string, hash: string | null): Promise<boolean> {
  // On compare TOUJOURS contre un hachage, même si le compte n'en a pas :
  // sinon le temps de réponse trahirait l'existence du compte (énumération).
  return bcrypt.compare(plain, hash ?? DUMMY_HASH);
}

/// Hachage d'un mot de passe impossible, utilisé pour égaliser le temps de
/// réponse quand l'utilisateur n'existe pas.
const DUMMY_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8ZbC5eQxYhMU8qzYw0oQ0v5vA4z3Ku";

/// Politique de mot de passe. Pas de règles absurdes (caractère spécial
/// obligatoire), mais une longueur minimale sérieuse et un rejet des mots
/// de passe les plus courants — c'est ce qui compte vraiment.
const COMMON = new Set([
  "password", "motdepasse", "12345678", "123456789", "1234567890", "azertyuiop",
  "qwertyuiop", "abcd1234", "superlife", "superlife1", "bienvenue", "admin123",
  "00000000", "11111111", "password1", "iloveyou", "football",
]);

export function validatePasswordPolicy(plain: string): string | null {
  if (plain.length < 10) return "Le mot de passe doit contenir au moins 10 caractères.";
  if (plain.length > 128) return "Le mot de passe est trop long (128 caractères maximum).";
  if (COMMON.has(plain.toLowerCase())) return "Ce mot de passe est trop courant. Choisissez-en un autre.";
  if (!/[a-zA-Z]/.test(plain) || !/[0-9]/.test(plain)) {
    return "Le mot de passe doit mélanger lettres et chiffres.";
  }
  return null;
}

/// Jetons opaques (réinitialisation). On envoie le jeton en clair par
/// e-mail et on ne stocke que son empreinte : la base ne suffit pas à
/// forger un lien de réinitialisation.
export function generateToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/// Comparaison à temps constant : évite qu'une attaque déduise l'empreinte
/// octet par octet en mesurant le temps de réponse.
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/// Mot de passe temporaire lisible (création de compte par l'admin).
export function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  // On boucle jusqu'à satisfaire la politique (lettres + chiffres) : un
  // tirage purement aléatoire peut sortir sans chiffre.
  for (;;) {
    const bytes = randomBytes(12);
    let out = "";
    for (const b of bytes) out += alphabet[b % alphabet.length];
    if (validatePasswordPolicy(out) === null) return out;
  }
}
