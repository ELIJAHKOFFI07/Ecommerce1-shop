import { db, TX } from "@/lib/db";
import { withApi, parseBody, parseQuery, ok, ApiError } from "@/lib/apiError";
import { requirePermission, requireSuperAdmin } from "@/lib/requireAuth";
import { adminUserCreateSchema, listQuery, role as roleSchema } from "@/lib/validators";
import { hashPassword, generateTempPassword } from "@/lib/password";
import { nextMemberNumber } from "@/lib/ids";
import { audit } from "@/lib/audit";
import { sendWelcome } from "@/lib/email";
import { z } from "zod";

export const adminUserSelect = {
  id: true, memberNumber: true, name: true, pseudo: true, email: true, phone: true, city: true, image: true,
  role: true, status: true, blocked: true, createdAt: true, lockedUntil: true,
  sponsor: { select: { id: true, name: true, memberNumber: true } },
  office: { select: { id: true, name: true } },
  wallet: { select: { balance: true } },
  _count: { select: { referrals: true, orders: true } },
} as const;

const query = listQuery.extend({ role: roleSchema.optional(), blocked: z.enum(["true", "false"]).optional() });

export const GET = withApi(async (req) => {
  await requirePermission("users", "view");
  const q = parseQuery(req, query);
  const where = {
    ...(q.role ? { role: q.role } : {}),
    ...(q.blocked ? { blocked: q.blocked === "true" } : {}),
    ...(q.q
      ? { OR: [{ name: { contains: q.q, mode: "insensitive" as const } }, { email: { contains: q.q.toLowerCase() } }, { memberNumber: { contains: q.q.toUpperCase() } }, { phone: { contains: q.q } }] }
      : {}),
  };
  const [items, total] = await Promise.all([
    db.user.findMany({ where, select: adminUserSelect, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * q.limit, take: q.limit }),
    db.user.count({ where }),
  ]);
  return ok({ items, total, page: q.page, pages: Math.ceil(total / q.limit) });
});

/// Création par l'admin avec mot de passe temporaire envoyé par e-mail.
/// Seul le SUPER_ADMIN peut créer un compte avec un rôle de staff.
export const POST = withApi(async (req) => {
  const admin = await requirePermission("users", "edit");
  const input = await parseBody(req, adminUserCreateSchema);
  if (input.role !== "CLIENT") await requireSuperAdmin();

  let sponsorId: string | null = null;
  if (input.sponsorMemberNumber) {
    const s = await db.user.findUnique({ where: { memberNumber: input.sponsorMemberNumber.toUpperCase() }, select: { id: true } });
    if (!s) throw new ApiError(400, "Numéro de parrain introuvable.");
    sponsorId = s.id;
  }
  const temp = generateTempPassword();
  const passwordHash = await hashPassword(temp);

  const user = await db.$transaction(async (tx) => {
    if (await tx.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
      throw new ApiError(409, "Un compte existe déjà avec cet e-mail.");
    }
    const memberNumber = await nextMemberNumber(tx);
    return tx.user.create({
      data: {
        memberNumber, name: input.name, email: input.email, phone: input.phone, role: input.role, status: input.status,
        officeId: input.officeId ?? null, sponsorId, passwordHash, wallet: { create: {} },
      },
      select: adminUserSelect,
    });
  }, TX);

  await audit("user.created", { userId: admin.id, target: user.id, req, meta: { role: input.role } });
  void sendWelcome(user.email, user.name, user.memberNumber, temp);
  return ok(user, 201);
});
