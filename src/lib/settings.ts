import { db } from "@/lib/db";

/// Paramètres plateforme — un seul point de lecture, partagé par toutes les
/// routes. Ligne singleton (id fixe = 1), créée à la première lecture si
/// elle n'existe pas encore.
///
/// Trois copies divergentes de cette même logique (défauts de commission
/// différents : 10 % vs 5 %) avaient fini par coexister côté Parse avant
/// d'être unifiées (parse-server/cloud/settings.js) — un seul point d'entrée
/// dès le départ ici pour ne pas reproduire l'erreur.
const DEFAULTS = { commissionPercent: 5, minWithdrawal: 5000 };

export async function loadSettings() {
  const settings = await db.platformSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, ...DEFAULTS },
  });
  return settings;
}
