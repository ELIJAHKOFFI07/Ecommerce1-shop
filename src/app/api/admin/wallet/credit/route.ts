import { db } from "@/lib/db";
import { withApi, parseBody, ok, ApiError } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { walletCreditSchema } from "@/lib/validators";
import { creditWallet, getBalance } from "@/lib/wallet";
import { formatFcfa } from "@/lib/money";
import { audit } from "@/lib/audit";
import { sendWalletCredit } from "@/lib/email";

/// Crédit d'un membre. Seul le SUPER_ADMIN, ou un admin à qui il a délégué
/// la permission `wallet:edit`, peut créditer — conformément au cahier des
/// charges (« crédité uniquement par le super administrateur, il peut
/// déléguer »).
export const POST = withApi(async (req) => {
  const admin = await requirePermission("wallet", "edit");
  const input = await parseBody(req, walletCreditSchema);
  const target = await db.user.findUnique({ where: { id: input.userId }, select: { email: true, name: true, blocked: true } });
  if (!target) throw new ApiError(404, "Membre introuvable.");
  if (target.blocked) throw new ApiError(400, "Ce compte est bloqué.");
  const tx = await creditWallet({ ...input, adminId: admin.id });
  await audit("wallet.credit", { userId: admin.id, target: input.userId, req, meta: { amount: input.amount, method: input.paymentMethod } });
  const balance = await getBalance(input.userId);
  void sendWalletCredit(target.email, target.name, formatFcfa(input.amount), formatFcfa(balance));
  return ok({ transaction: tx, balance }, 201);
});
