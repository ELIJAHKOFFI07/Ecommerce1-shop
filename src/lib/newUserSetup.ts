import { db } from "@/lib/db";

/// Initialisation d'un compte fraîchement créé — équivalent du trigger
/// handle_new_user de Supabase (portefeuille + code de parrainage).
///
/// Appelée depuis DEUX chemins différents (l'événement `createUser` de
/// l'adaptateur Auth.js pour Google, et la route d'inscription classique
/// pour e-mail/mot de passe) : factorisée ici plutôt que dupliquée, pour ne
/// pas reproduire le bug déjà rencontré côté Parse où trois copies de la
/// même logique avaient fini par diverger silencieusement.
export async function setupNewUser(userId: string) {
  const existingWallet = await db.wallet.findUnique({ where: { userId } });
  if (!existingWallet) {
    await db.wallet.create({ data: { userId, balance: 0 } });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (user && !user.referralCode) {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    await db.user.update({ where: { id: userId }, data: { referralCode: code } });
  }
}
