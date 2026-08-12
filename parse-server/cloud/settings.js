/**
 * Paramètres plateforme — un seul point de lecture, partagé par orders.js et
 * wallet.js.
 *
 * Avant ce fichier, chacun des deux avait sa propre fonction `loadSettings`
 * avec un défaut différent pour `commissionPercent` (10 dans l'un, 5 dans
 * l'autre) — un vendeur crédité par confirmDelivery et un retrait via
 * requestWithdrawal auraient pu appliquer deux taux différents pour la même
 * plateforme, selon lequel des deux fichiers avait été modifié en dernier.
 * `ensureSettings()` crée le document singleton au démarrage (comme le
 * faisait le `insert … on conflict do nothing` de schema.sql), pour que ce
 * défaut ne soit jamais réellement utilisé une fois le serveur en route.
 */

const DEFAULTS = { commissionPercent: 5, minWithdrawal: 5000 };

async function ensureSettings() {
  const existing = await new Parse.Query("PlatformSettings").first({ useMasterKey: true });
  if (existing) return;

  const settings = new Parse.Object("PlatformSettings");
  settings.set("commissionPercent", DEFAULTS.commissionPercent);
  settings.set("minWithdrawal", DEFAULTS.minWithdrawal);
  settings.set("announcementActive", false);
  await settings.save(null, { useMasterKey: true });
  console.log("[settings] document PlatformSettings créé avec les valeurs par défaut");
}

async function loadSettings() {
  const settings = await new Parse.Query("PlatformSettings").first({ useMasterKey: true });
  return {
    commissionPercent: settings?.get("commissionPercent") ?? DEFAULTS.commissionPercent,
    minWithdrawal: settings?.get("minWithdrawal") ?? DEFAULTS.minWithdrawal,
  };
}

ensureSettings();

module.exports = { loadSettings, ensureSettings };
