/// Options par défaut pour les transactions interactives qui verrouillent
/// une ligne contestée (FOR UPDATE) — placeOrder, placeBid, retraits.
///
/// Le défaut Prisma (5 s) s'est révélé trop court sous contention réelle
/// pendant les tests de charge : plusieurs transactions qui font la queue
/// sur le même verrou peuvent dépasser 5 s de délai cumulé avant même
/// d'avoir commencé leur propre travail, sans qu'il y ait de bug — juste de
/// l'attente légitime. Le rejet qui en résulte n'est pas "Stock insuffisant"
/// mais une erreur de transaction expirée, plus confuse pour l'appelant.
export const TRANSACTION_OPTIONS = { timeout: 15_000, maxWait: 10_000 };
