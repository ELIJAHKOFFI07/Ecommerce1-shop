/// Mot de passe temporaire lisible, à communiquer à l'utilisateur. Il devra
/// en choisir un autre à la connexion suivante (User.mustChangePassword).
///
/// Extrait de src/lib/admin/guard.ts (qui reste en place, encore utilisé par
/// les pages qui n'ont pas basculé sur les routes /api/admin/*) pour ne pas
/// faire dépendre le nouveau backend Next.js/Prisma du client Supabase que
/// ce fichier importe par ailleurs.
export function generateTempPassword(): string {
  // Alphabet sans caractères ambigus (0/O, 1/l/I) pour éviter les erreurs de
  // saisie quand le mot de passe est dicté ou recopié.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const body = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `DTS-${body}`;
}
