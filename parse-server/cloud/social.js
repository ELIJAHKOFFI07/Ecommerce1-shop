/**
 * Social — équivalent de open_conversation, mark_conversation_read,
 * mark_story_viewed, answer_question, active_viewers, register_product_view.
 */

/** params: { sellerId, productId? } */
Parse.Cloud.define("openConversation", async (request) => {
  const user = request.user;
  if (!user) throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Non connecté");

  const { sellerId, productId } = request.params;
  if (sellerId === user.id) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Impossible de discuter avec soi-même");
  }
  const seller = await new Parse.Query(Parse.User).get(sellerId, { useMasterKey: true });

  const query = new Parse.Query("Conversation")
    .containsAll("participants", [user.id, sellerId]);
  const existing = (await query.find({ useMasterKey: true })).find((c) => {
    const p = c.get("participants");
    return (
      p.length === 2 &&
      (c.get("product")?.id ?? null) === (productId ?? null)
    );
  });
  if (existing) return { conversationId: existing.id };

  const conversation = new Parse.Object("Conversation");
  conversation.set("participants", [user.id, sellerId]);
  if (productId) {
    conversation.set("product", new Parse.Object("Product").set("objectId", productId));
  }

  const acl = new Parse.ACL();
  acl.setReadAccess(user, true);
  acl.setReadAccess(seller, true);
  acl.setWriteAccess(user, true);
  acl.setWriteAccess(seller, true);
  conversation.setACL(acl);

  await conversation.save(null, { useMasterKey: true });
  return { conversationId: conversation.id };
});

/** params: { conversationId } */
Parse.Cloud.define("markConversationRead", async (request) => {
  const user = request.user;
  if (!user) throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Non connecté");

  const unread = await new Parse.Query("Message")
    .equalTo("conversation", new Parse.Object("Conversation").set("objectId", request.params.conversationId))
    .notEqualTo("sender", user)
    .doesNotExist("readAt")
    .find({ useMasterKey: true });

  const now = new Date();
  for (const message of unread) message.set("readAt", now);
  await Parse.Object.saveAll(unread, { useMasterKey: true });

  return { ok: true, count: unread.length };
});

/** params: { storyId } */
Parse.Cloud.define("markStoryViewed", async (request) => {
  const user = request.user;
  if (!user) return { ok: true }; // silencieux pour un visiteur, comme la RPC

  const story = new Parse.Object("ShopStory");
  story.id = request.params.storyId;

  const existing = await new Parse.Query("ShopStoryView")
    .equalTo("story", story)
    .equalTo("viewer", user)
    .first({ useMasterKey: true });
  if (existing) return { ok: true };

  const view = new Parse.Object("ShopStoryView");
  view.set("story", story);
  view.set("viewer", user);
  await view.save(null, { useMasterKey: true });
  return { ok: true };
});

/** params: { questionId, answer } */
Parse.Cloud.define("answerQuestion", async (request) => {
  const user = request.user;
  if (!user) throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Non connecté");

  const { questionId, answer } = request.params;
  const question = await new Parse.Query("ProductQuestion")
    .include("product")
    .get(questionId, { useMasterKey: true });
  const shop = await question.get("product").get("shop").fetch({ useMasterKey: true });
  if (shop.get("owner")?.id !== user.id) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Non autorisé");
  }

  question.set("answer", answer);
  question.set("answeredAt", new Date());
  await question.save(null, { useMasterKey: true });
  return { ok: true };
});

/**
 * activeViewers — équivalent de active_viewers.
 * « X personnes regardent », fenêtre de 10 minutes sur RecentlyViewed.
 * params: { productId }
 */
Parse.Cloud.define("activeViewers", async (request) => {
  const since = new Date(Date.now() - 10 * 60 * 1000);
  const views = await new Parse.Query("RecentlyViewed")
    .equalTo("product", new Parse.Object("Product").set("objectId", request.params.productId))
    .greaterThan("viewedAt", since)
    .find({ useMasterKey: true });
  return { count: new Set(views.map((v) => v.get("user")?.id)).size };
});

/** params: { productId } */
Parse.Cloud.define("registerProductView", async (request) => {
  const product = new Parse.Object("Product");
  product.id = request.params.productId;
  product.increment("viewsCount", 1);
  await product.save(null, { useMasterKey: true });

  const user = request.user;
  if (user) {
    const existing = await new Parse.Query("RecentlyViewed")
      .equalTo("user", user)
      .equalTo("product", product)
      .first({ useMasterKey: true });
    if (existing) {
      existing.set("viewedAt", new Date());
      await existing.save(null, { useMasterKey: true });
    } else {
      const view = new Parse.Object("RecentlyViewed");
      view.set("user", user);
      view.set("product", product);
      view.set("viewedAt", new Date());
      await view.save(null, { useMasterKey: true });
    }
  }
  return { ok: true };
});
