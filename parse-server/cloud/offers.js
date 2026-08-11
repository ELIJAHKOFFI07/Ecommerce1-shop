/**
 * Offres et négociation — équivalent de make_offer / respond_to_offer.
 *
 * Bornes (50 % à 100 % du prix), limite de 3 offres par acheteur et par
 * produit, et interdiction pour le vendeur de négocier avec lui-même : tout
 * est revérifié ici, jamais fait confiance au client.
 */

/**
 * makeOffer — équivalent de make_offer.
 * params: { productId, amount }
 */
Parse.Cloud.define("makeOffer", async (request) => {
  const user = request.user;
  if (!user) throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Non connecté");

  const { productId, amount } = request.params;
  const product = await new Parse.Query("Product")
    .equalTo("status", "active")
    .get(productId, { useMasterKey: true })
    .catch(() => null);
  if (!product) throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Produit indisponible");

  const seller = product.get("seller");
  if (seller?.id === user.id) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Vous êtes le vendeur");
  }

  const price = product.get("price");
  if (amount < Math.ceil(price * 0.5) || amount > price) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Offre hors bornes (50 % à 100 % du prix)");
  }

  const count = await new Parse.Query("Offer")
    .equalTo("product", product)
    .equalTo("buyer", user)
    .count({ useMasterKey: true });
  if (count >= 3) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Limite de 3 offres atteinte");
  }

  const offer = new Parse.Object("Offer");
  offer.set("product", product);
  offer.set("buyer", user);
  offer.set("shop", product.get("shop"));
  offer.set("amount", amount);
  offer.set("status", "pending");
  await offer.save(null, { useMasterKey: true });

  const notification = new Parse.Object("Notification");
  notification.set("user", seller);
  notification.set("type", "offer");
  notification.set("title", "Nouvelle offre");
  notification.set("body", `Offre de ${amount} FCFA sur « ${product.get("title")} »`);
  notification.set("data", { productId: product.id });
  await notification.save(null, { useMasterKey: true });

  return { offerId: offer.id };
});

/**
 * respondToOffer — équivalent de respond_to_offer.
 * params: { offerId, action: "accepted"|"declined"|"countered", counterAmount? }
 */
Parse.Cloud.define("respondToOffer", async (request) => {
  const user = request.user;
  if (!user) throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Non connecté");

  const { offerId, action, counterAmount } = request.params;
  const offer = await new Parse.Query("Offer")
    .include(["product", "shop"])
    .get(offerId, { useMasterKey: true });

  if (offer.get("shop")?.get("owner")?.id !== user.id) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Offre introuvable");
  }
  if (offer.get("status") !== "pending") {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Offre déjà traitée");
  }

  const product = offer.get("product");

  if (action === "accepted") {
    offer.set("status", "accepted");
  } else if (action === "declined") {
    offer.set("status", "declined");
  } else if (action === "countered") {
    if (
      counterAmount == null ||
      counterAmount <= offer.get("amount") ||
      counterAmount > product.get("price")
    ) {
      throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Contre-offre invalide");
    }
    offer.set("status", "countered");
    offer.set("counterAmount", counterAmount);
  } else {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Action inconnue");
  }

  await offer.save(null, { useMasterKey: true });

  const notification = new Parse.Object("Notification");
  notification.set("user", offer.get("buyer"));
  notification.set("type", "offer");
  notification.set("title", "Réponse à votre offre");
  notification.set("body", `Votre offre sur « ${product.get("title")} » : ${action}`);
  notification.set("data", { productId: product.id });
  await notification.save(null, { useMasterKey: true });

  return { ok: true };
});
