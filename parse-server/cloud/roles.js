/**
 * Rôles — remplacent profiles.is_admin / profiles.is_seller.
 *
 * Côté Supabase, ces deux colonnes avaient été retirées des droits d'écriture
 * du client (revoke/grant) après qu'une écriture directe `update({is_admin})`
 * a été trouvée dans le back-office : n'importe quel compte pouvait se
 * promouvoir. Le rôle Parse évite structurellement de reposer sur un champ
 * porté par l'objet utilisateur lui-même.
 */

const ROLES = ["admin", "seller"];

async function getRole(name) {
  const q = new Parse.Query(Parse.Role);
  q.equalTo("name", name);
  return q.first({ useMasterKey: true });
}

async function ensureRoles() {
  for (const name of ROLES) {
    if (await getRole(name)) continue;
    // Un rôle que le client peut modifier est un rôle inutile : l'ACL du
    // rôle lui-même est en lecture publique, écriture master key seulement.
    const acl = new Parse.ACL();
    acl.setPublicReadAccess(true);
    acl.setPublicWriteAccess(false);
    await new Parse.Role(name, acl).save(null, { useMasterKey: true });
    console.log(`[roles] rôle « ${name} » créé`);
  }
}

async function addToRole(user, roleName) {
  const role = await getRole(roleName);
  if (!role) throw new Error(`Rôle ${roleName} introuvable`);
  role.getUsers().add(user);
  await role.save(null, { useMasterKey: true });
}

async function removeFromRole(user, roleName) {
  const role = await getRole(roleName);
  if (!role) return;
  role.getUsers().remove(user);
  await role.save(null, { useMasterKey: true });
}

async function hasRole(user, roleName) {
  if (!user) return false;
  const role = await getRole(roleName);
  if (!role) return false;
  const q = role.getUsers().query();
  q.equalTo("objectId", user.id);
  return Boolean(await q.first({ useMasterKey: true }));
}

/** À placer en tête de toute Cloud Function réservée au back-office. */
async function requireAdmin(request) {
  if (!request.master && !(await hasRole(request.user, "admin"))) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Réservé aux administrateurs");
  }
}

/** Équivalent de la RPC admin_set_user_role. */
Parse.Cloud.define("adminSetUserRole", async (request) => {
  await requireAdmin(request);
  const { userId, role } = request.params;
  if (!["user", "seller", "admin"].includes(role)) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Rôle inconnu");
  }

  const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
  const wasSeller = await hasRole(user, "seller");

  // On repart d'une ardoise propre : promouvoir puis rétrograder ne doit pas
  // laisser un rôle résiduel.
  await removeFromRole(user, "admin");
  await removeFromRole(user, "seller");
  if (role === "admin") {
    await addToRole(user, "admin");
    await addToRole(user, "seller");
  } else if (role === "seller") {
    await addToRole(user, "seller");
  }

  // Équivalent du trigger on_seller_revoked : un vendeur rétrogradé garde ses
  // produits, mais ils ne doivent plus rester en vente sans surveillance.
  if (wasSeller && role === "user") {
    const products = await new Parse.Query("Product")
      .equalTo("seller", user)
      .equalTo("status", "active")
      .find({ useMasterKey: true });
    for (const product of products) product.set("status", "paused");
    await Parse.Object.saveAll(products, { useMasterKey: true });
  }

  return { ok: true, role };
});

ensureRoles();

module.exports = { ensureRoles, addToRole, removeFromRole, hasRole, requireAdmin };
