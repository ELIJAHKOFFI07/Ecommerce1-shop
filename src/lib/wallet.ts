import { Prisma } from "../../prisma/generated/client";
import type { PaymentMethod } from "../../prisma/generated/client";
import { db, TX, type Tx } from "./db";
import { ApiError } from "./apiError";
import { dec } from "./decimal";

/// Toutes les opérations financières. Règles :
///  - une transaction Postgres par opération, tout ou rien ;
///  - les lignes Wallet et Settings sont verrouillées (FOR UPDATE) avant
///    lecture du solde : deux débits simultanés ne peuvent pas passer sur
///    un solde insuffisant ;
///  - un mouvement WalletTransaction est écrit pour chaque centime déplacé.

async function lockWallet(tx: Tx, userId: string) {
  // Crée le portefeuille s'il manque, puis le verrouille.
  await tx.wallet.upsert({ where: { userId }, create: { userId }, update: {} });
  const rows = await tx.$queryRaw<{ id: string; balance: Prisma.Decimal }[]>`
    SELECT "id", "balance" FROM "Wallet" WHERE "userId" = ${userId}::uuid FOR UPDATE
  `;
  const w = rows[0];
  if (!w) throw new ApiError(500, "Portefeuille introuvable.");
  return { id: w.id, balance: dec(w.balance) };
}

async function lockSettings(tx: Tx) {
  await tx.settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
  const rows = await tx.$queryRaw<{ generalBalance: Prisma.Decimal; taxBalance: Prisma.Decimal }[]>`
    SELECT "generalBalance", "taxBalance" FROM "Settings" WHERE "id" = 1 FOR UPDATE
  `;
  return { general: dec(rows[0]!.generalBalance), tax: dec(rows[0]!.taxBalance) };
}

/// Crédit par l'admin. L'argent vient du solde général : il doit y en avoir.
export async function creditWallet(input: {
  userId: string;
  amount: number;
  adminId: string;
  description?: string;
  paymentMethod?: PaymentMethod;
  proofUrl?: string;
}) {
  return db.$transaction(async (tx) => {
    const amount = dec(input.amount);
    const settings = await lockSettings(tx);
    if (settings.general.lessThan(amount)) {
      throw new ApiError(400, `Solde général insuffisant (disponible : ${settings.general.toFixed(0)} F).`);
    }
    const wallet = await lockWallet(tx, input.userId);
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } });
    await tx.settings.update({ where: { id: 1 }, data: { generalBalance: { decrement: amount } } });
    return tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: input.userId,
        amount,
        type: "CREDIT",
        description: input.description ?? "Alimentation du solde par l'administration",
        paymentMethod: input.paymentMethod,
        proofUrl: input.proofUrl,
        adminId: input.adminId,
      },
    });
  }, TX);
}

/// Débit (paiement de TVA/frais). `destination` : où va l'argent.
export async function debitWallet(
  tx: Tx,
  input: { userId: string; amount: number; referenceId: string; description: string; destination: "GENERAL" | "TAX" },
) {
  const amount = dec(input.amount);
  const wallet = await lockWallet(tx, input.userId);
  if (wallet.balance.lessThan(amount)) {
    throw new ApiError(400, `Solde insuffisant (solde : ${wallet.balance.toFixed(0)} F, requis : ${amount.toFixed(0)} F).`);
  }
  await lockSettings(tx);
  await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: amount } } });
  await tx.settings.update({
    where: { id: 1 },
    data: input.destination === "TAX" ? { taxBalance: { increment: amount } } : { generalBalance: { increment: amount } },
  });
  return tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      userId: input.userId,
      amount: amount.negated(),
      type: "DEBIT",
      description: input.description,
      referenceId: input.referenceId,
    },
  });
}

/// Transfert entre membres. Verrous pris dans l'ordre des identifiants
/// pour qu'un transfert A→B et un B→A simultanés ne s'interbloquent pas.
export async function transferWallet(input: { senderId: string; receiverId: string; amount: number }) {
  if (input.senderId === input.receiverId) throw new ApiError(400, "Impossible de se transférer à soi-même.");
  return db.$transaction(async (tx) => {
    const amount = dec(input.amount);
    const [first, second] = [input.senderId, input.receiverId].sort();
    const wallets = { [first!]: await lockWallet(tx, first!), [second!]: await lockWallet(tx, second!) };
    const sender = wallets[input.senderId]!;
    const receiver = wallets[input.receiverId]!;
    if (sender.balance.lessThan(amount)) {
      throw new ApiError(400, `Solde insuffisant (solde : ${sender.balance.toFixed(0)} F).`);
    }
    const [s, r] = await Promise.all([
      tx.user.findUnique({ where: { id: input.senderId }, select: { name: true, memberNumber: true } }),
      tx.user.findUnique({ where: { id: input.receiverId }, select: { name: true, memberNumber: true, blocked: true } }),
    ]);
    if (!r || r.blocked) throw new ApiError(400, "Destinataire indisponible.");
    await tx.wallet.update({ where: { id: sender.id }, data: { balance: { decrement: amount } } });
    await tx.wallet.update({ where: { id: receiver.id }, data: { balance: { increment: amount } } });
    await tx.walletTransaction.createMany({
      data: [
        {
          walletId: sender.id, userId: input.senderId, amount: amount.negated(), type: "TRANSFER",
          description: `Transfert envoyé à ${r.name} (${r.memberNumber})`, referenceId: input.receiverId,
        },
        {
          walletId: receiver.id, userId: input.receiverId, amount, type: "TRANSFER",
          description: `Transfert reçu de ${s?.name} (${s?.memberNumber})`, referenceId: input.senderId,
        },
      ],
    });
    return { amount: amount.toString(), recipient: { name: r.name, memberNumber: r.memberNumber } };
  }, TX);
}

/// Ajustement manuel du solde général (SUPER_ADMIN).
export async function adjustGeneralBalance(input: { type: "CREDIT" | "DEBIT"; amount: number; adminId: string; description: string }) {
  return db.$transaction(async (tx) => {
    const amount = dec(input.amount);
    const s = await lockSettings(tx);
    if (input.type === "DEBIT" && s.general.lessThan(amount)) {
      throw new ApiError(400, "Solde général insuffisant.");
    }
    await tx.settings.update({
      where: { id: 1 },
      data: { generalBalance: input.type === "CREDIT" ? { increment: amount } : { decrement: amount } },
    });
    return tx.walletTransaction.create({
      data: { amount: input.type === "CREDIT" ? amount : amount.negated(), type: input.type, description: input.description, adminId: input.adminId },
    });
  }, TX);
}

/// Bascule du solde TVA vers le solde général (SUPER_ADMIN).
export async function transferTaxToGeneral(input: { amount: number; adminId: string }) {
  return db.$transaction(async (tx) => {
    const amount = dec(input.amount);
    const s = await lockSettings(tx);
    if (s.tax.lessThan(amount)) throw new ApiError(400, "Solde taxe insuffisant.");
    await tx.settings.update({ where: { id: 1 }, data: { taxBalance: { decrement: amount }, generalBalance: { increment: amount } } });
    return tx.walletTransaction.create({
      data: { amount, type: "TRANSFER", description: "Transfert du solde taxe vers le solde général", referenceId: "TAX_TRANSFER", adminId: input.adminId },
    });
  }, TX);
}

export async function getBalance(userId: string): Promise<Prisma.Decimal> {
  const w = await db.wallet.findUnique({ where: { userId }, select: { balance: true } });
  return w?.balance ?? dec(0);
}
