/**
 * Parrainage — équivalent de link_referral, redeem_referral,
 * referral_leaderboard, my_referral_rank.
 */

/**
 * Attache un filleul à un parrain si le code est valide et que le filleul
 * n'a pas déjà de parrain. Silencieux en cas de code invalide — c'est le
 * comportement de la version Postgres (appelée automatiquement à
 * l'inscription, une erreur ne doit pas bloquer la création du compte).
 */
async function linkReferral(referred, code) {
  const referrer = await new Parse.Query(Parse.User)
    .equalTo("referralCode", String(code).trim().toUpperCase())
    .notEqualTo("objectId", referred.id)
    .first({ useMasterKey: true });
  if (!referrer) return;

  const existing = await new Parse.Query("Referral")
    .equalTo("referred", referred)
    .first({ useMasterKey: true });
  if (existing) return;

  const referral = new Parse.Object("Referral");
  referral.set("referrer", referrer);
  referral.set("referred", referred);
  referral.set("code", String(code).trim().toUpperCase());
  referral.set("rewardPoints", 0);
  await referral.save(null, { useMasterKey: true });

  referred.increment("loyaltyPoints", 100);
  referred.set("referredBy", referrer);
  await referred.save(null, { useMasterKey: true });
}

/** params: { referredId, code } — utilisée à l'inscription. */
Parse.Cloud.define("linkReferral", async (request) => {
  const { referredId, code } = request.params;
  const referred = await new Parse.Query(Parse.User).get(referredId, { useMasterKey: true });
  await linkReferral(referred, code);
  return { ok: true };
});

/** params: { code } — rattacher un parrain après coup, pour l'utilisateur connecté. */
Parse.Cloud.define("redeemReferral", async (request) => {
  const user = request.user;
  if (!user) throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Non connecté");
  await linkReferral(user, request.params.code);
  return { ok: true };
});

/**
 * params: { limit? } (défaut 20)
 *
 * Regroupe en mémoire plutôt qu'avec une aggregation pipeline Mongo/PG :
 * suffisant tant que la table Referral reste de taille MVP. Au-delà de
 * quelques dizaines de milliers de lignes, remplacer par une pipeline
 * d'agrégation (master key requise, Parse en expose une).
 */
Parse.Cloud.define("referralLeaderboard", async (request) => {
  const limit = request.params.limit ?? 20;

  const referrals = await new Parse.Query("Referral").limit(100000).find({ useMasterKey: true });
  const counts = new Map();
  for (const r of referrals) {
    const id = r.get("referrer").id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  const users = await new Parse.Query(Parse.User)
    .containedIn("objectId", ranked.map(([id]) => id))
    .find({ useMasterKey: true });
  const byId = new Map(users.map((u) => [u.id, u]));

  return ranked.map(([id, referralsCount]) => ({
    userId: id,
    username: byId.get(id)?.get("username"),
    avatarUrl: byId.get(id)?.get("avatarUrl"),
    referralsCount,
  }));
});

/** params: aucun — rang de l'utilisateur connecté dans le classement. */
Parse.Cloud.define("myReferralRank", async (request) => {
  const user = request.user;
  if (!user) throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Non connecté");

  const referrals = await new Parse.Query("Referral").limit(100000).find({ useMasterKey: true });
  const counts = new Map();
  for (const r of referrals) {
    const id = r.get("referrer").id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const index = ranked.findIndex(([id]) => id === user.id);
  return { rank: index === -1 ? null : index + 1 };
});

module.exports = { linkReferral };
