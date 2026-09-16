import { db } from "@/lib/db";
import { withApi, parseBody, ok, ApiError } from "@/lib/apiError";
import { requireUser } from "@/lib/requireAuth";
import { walletTransferSchema } from "@/lib/validators";
import { transferWallet } from "@/lib/wallet";
import { consumeRateLimit } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";

export const POST = withApi(async (req) => {
  const me = await requireUser();
  await consumeRateLimit("transfer", me.id);
  const input = await parseBody(req, walletTransferSchema);
  const recipient = await db.user.findUnique({ where: { memberNumber: input.recipientMemberNumber.toUpperCase() }, select: { id: true } });
  if (!recipient) throw new ApiError(404, "Destinataire introuvable.");
  const result = await transferWallet({ senderId: me.id, receiverId: recipient.id, amount: input.amount });
  await audit("wallet.transfer", { userId: me.id, target: recipient.id, req, meta: { amount: input.amount } });
  return ok(result);
});
