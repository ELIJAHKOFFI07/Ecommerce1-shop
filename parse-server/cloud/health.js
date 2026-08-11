/**
 * Vérification de bout en bout après déploiement — voir README.md
 * « Vérification ». Ne touche à aucune classe, ne nécessite pas la master key.
 */
Parse.Cloud.define("ping", async () => ({ ok: true, at: new Date().toISOString() }));
