import { z } from "zod";

/// Schémas de validation de TOUTES les entrées API. Rien n'atteint la base
/// sans être passé par un schéma : types, longueurs, bornes, identifiants.

// ── Primitives ──
export const uuid = z.string().uuid();
export const email = z.string().trim().toLowerCase().email().max(254);
export const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ]{8,20}$/, "Numéro de téléphone invalide")
  .transform((s) => s.replace(/\s+/g, ""));
export const shortText = z.string().trim().min(1).max(120);
export const longText = z.string().trim().max(2000);
export const optionalLongText = longText.optional().or(z.literal("").transform(() => undefined));
export const amount = z.coerce.number().int().positive().max(1_000_000_000);
export const amountOrZero = z.coerce.number().int().min(0).max(1_000_000_000);
export const quantity = z.coerce.number().int().positive().max(10_000);
export const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,80}$/);
export const httpsUrl = z.string().url().startsWith("https://").max(500);

// ── Auth ──
export const registerSchema = z.object({
  name: shortText,
  email,
  phone: phone.optional().or(z.literal("").transform(() => undefined)),
  password: z.string().min(10).max(128),
});
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(20).max(200), password: z.string().min(10).max(128) });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(10).max(128) });
export const profileSchema = z.object({ name: shortText.optional(), phone: phone.optional().nullable(), image: httpsUrl.optional() });

// ── Adresses ──
export const addressSchema = z.object({
  label: shortText.default("Domicile"),
  fullName: shortText,
  phone,
  city: shortText,
  commune: shortText.optional().nullable(),
  details: z.string().trim().min(3).max(300),
  isDefault: z.boolean().default(false),
});

// ── Catalogue ──
export const productSchema = z.object({
  sku: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9-_]+$/),
  title: shortText,
  slug: slug.optional(),
  description: optionalLongText,
  price: amount,
  compareAtPrice: amountOrZero.optional().nullable(),
  images: z.array(httpsUrl).max(8).default([]),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  lowStockAlert: z.coerce.number().int().min(0).max(100_000).default(5),
  categoryIds: z.array(uuid).max(10).default([]),
});
export const productUpdateSchema = productSchema.partial();

export const categorySchema = z.object({
  name: shortText,
  slug: slug.optional(),
  image: httpsUrl.optional().nullable(),
  position: z.coerce.number().int().min(0).max(1000).optional(),
});

export const listQuery = z.object({
  q: z.string().trim().max(80).optional(),
  category: slug.optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

// ── Stock ──
export const stockMovementSchema = z.object({
  productId: uuid,
  quantity: z.coerce.number().int().min(-100_000).max(100_000).refine((n) => n !== 0, "Quantité nulle"),
  reason: z.enum(["RECEPTION", "ADJUSTMENT", "LOSS", "RETURN"]),
  note: optionalLongText,
});

// ── Commandes ──
export const paymentMethod = z.enum(["CASH_ON_DELIVERY", "MOBILE_MONEY"]);

export const orderCreateSchema = z.object({
  items: z.array(z.object({ productId: uuid, quantity })).min(1).max(50),
  paymentMethod,
  address: z.object({ fullName: shortText, phone, city: shortText, commune: shortText.optional().nullable(), details: z.string().trim().min(3).max(300) }),
  saveAddress: z.boolean().default(false),
  note: optionalLongText,
});

export const orderStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]),
  cancelReason: longText.optional(),
});

export const orderPaymentSchema = z.object({
  paymentStatus: z.enum(["UNPAID", "PAID", "REFUNDED"]),
  paymentRef: z.string().trim().max(80).optional().nullable(),
});

export const orderListQuery = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
  userId: uuid.optional(),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ── Utilisateurs (admin) ──
export const role = z.enum(["SUPER_ADMIN", "ADMIN", "STOCK_MANAGER", "SUPPORT", "CLIENT"]);

export const adminUserCreateSchema = z.object({
  name: shortText,
  email,
  phone: phone.optional().or(z.literal("").transform(() => undefined)),
  role: role.default("CLIENT"),
});

export const adminUserUpdateSchema = z.object({
  name: shortText.optional(),
  phone: phone.optional().nullable().or(z.literal("").transform(() => null)),
  role: role.optional(),
  blocked: z.boolean().optional(),
});

export const permissionsSchema = z.object({
  permissions: z.array(z.object({ slug: z.string().max(40), canView: z.boolean(), canEdit: z.boolean() })).max(30),
});

// ── Paramètres ──
export const settingsSchema = z.object({
  siteName: shortText.optional(),
  siteEmail: email.optional().nullable().or(z.literal("").transform(() => null)),
  sitePhone: phone.optional().nullable().or(z.literal("").transform(() => null)),
  siteAddress: z.string().trim().max(300).optional().nullable(),
  shippingFee: amountOrZero.optional(),
  freeShippingThreshold: amountOrZero.optional().nullable(),
  mobileMoneyNumber: phone.optional().nullable().or(z.literal("").transform(() => null)),
  mobileMoneyName: shortText.optional().nullable().or(z.literal("").transform(() => null)),
});
