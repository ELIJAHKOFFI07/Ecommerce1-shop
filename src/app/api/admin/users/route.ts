import { db } from "@/lib/db";
import { withApi, parseBody, parseQuery, ok, ApiError } from "@/lib/apiError";
import { requirePermission, requireSuperAdmin } from "@/lib/requireAuth";
import { adminUserCreateSchema, listQuery, role as roleSchema } from "@/lib/validators";
import { hashPassword, generateTempPassword } from "@/lib/password";
import { audit } from "@/lib/audit";
import { sendWelcome } from "@/lib/email";
import { z } from "zod";

export const adminUserSelect = {
  id: true, name: true, email: true, phone: true, image: true, role: true, blocked: true, createdAt: true, lockedUntil: true,
  _count: { select: { orders: true } },
} as const;

const query = listQuery.extend({ role: roleSchema.optional(), blocked: z.enum(["true", "false"]).optional() });

export const GET = withApi(async (req) => {
  await requirePermission("users", "view");
  const q = parseQuery(req, query);
  const where = {
    ...(q.role ? { role: q.role } : {}),
    ...(q.blocked ? { blocked: q.blocked === "true" } : {}),
    ...(q.q ? { OR: [{ name: { contains: q.q, mode: "insensitive" as const } }, { email: { contains: q.q.toLowerCase() } }, { phone: { contains: q.q.replace(/\s+/g, "") } }] } : {}),
  };
  const [items, total] = await Promise.all([
    db.user.findMany({ where, select: adminUserSelect, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * q.limit, take: q.limit }),
    db.user.count({ where }),
  ]);
  return ok({ items, total, page: q.page, pages: Math.ceil(total / q.limit) });
});

/// Création par l'admin, mot de passe temporaire envoyé par e-mail. Seul
/// le SUPER_ADMIN crée un compte de l'équipe.
export const POST = withApi(async (req) => {
  const admin = await requirePermission("users", "edit");
  const input = await parseBody(req, adminUserCreateSchema);
  if (input.role !== "CLIENT") await requireSuperAdmin();
  if (await db.user.findUnique({ where: { email: input.email }, select: { id: true } })) throw new ApiError(409, "Un compte existe déjà avec cet e-mail.");
  const temp = generateTempPassword();
  const user = await db.user.create({ data: { name: input.name, email: input.email, phone: input.phone, role: input.role, passwordHash: await hashPassword(temp) }, select: adminUserSelect });
  await audit("user.created", { userId: admin.id, target: user.id, req, meta: { role: input.role } });
  void sendWelcome(user.email, user.name, temp);
  return ok(user, 201);
});
