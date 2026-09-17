import { z } from "zod";

/// Schémas de validation de TOUTES les entrées API.
///
/// Secure by design : rien n'atteint la base sans être passé par un schéma.
/// Prisma paramètre ses requêtes (pas d'injection SQL), mais la validation
/// bloque en amont les types inattendus, les longueurs absurdes, les
/// montants négatifs et les identifiants mal formés.

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
/// Montants en FCFA : entiers positifs (pas de centimes en pratique), plafond
/// large mais fini pour bloquer les valeurs délirantes.
export const amount = z.coerce.number().int().positive().max(1_000_000_000);
export const quantity = z.coerce.number().int().positive().max(100_000);
export const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,80}$/);
export const paymentMethod = z.enum(["WALLET", "CASH", "MOBILE_MONEY", "OTHER"]);
export const httpsUrl = z.string().url().startsWith("https://").max(500);

// ── Auth ──
export const registerSchema = z.object({
  name: shortText,
  email,
  phone,
  password: z.string().min(10).max(128),
  city: shortText.optional(),
  sponsorMemberNumber: z.string().trim().max(30).optional().or(z.literal("")),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(10).max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(10).max(128),
});

export const profileSchema = z.object({
  name: shortText.optional(),
  phone: phone.optional(),
  city: shortText.optional(),
  pseudo: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_.-]+$/).optional(),
  image: httpsUrl.optional(),
});

// ── Catalogue ──
export const productSchema = z.object({
  sku: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9-_]+$/),
  title: shortText,
  slug: slug.optional(),
  description: optionalLongText,
  price: amount,
  tva: z.coerce.number().min(0).max(100).default(20),
  commission: z.coerce.number().min(0).max(1_000_000_000).default(0),
  images: z.array(httpsUrl).max(8).default([]),
  active: z.boolean().default(true),
  lowStockAlert: z.coerce.number().int().min(0).max(100_000).default(5),
  categoryIds: z.array(uuid).max(10).default([]),
});
export const productUpdateSchema = productSchema.partial();

export const categorySchema = z.object({
  name: shortText,
  slug: slug.optional(),
  image: httpsUrl.optional().nullable(),
  parentId: uuid.optional().nullable(),
});

export const listQuery = z.object({
  q: z.string().trim().max(80).optional(),
  category: slug.optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

// ── Commandes ──
export const orderCreateSchema = z.object({
  items: z.array(z.object({ productId: uuid, quantity })).min(1).max(50),
  claimReference: z.string().trim().min(3).max(60).regex(/^[A-Za-z0-9-_/ ]+$/),
  salesNo: z.string().trim().min(3).max(60).regex(/^[A-Za-z0-9-_/ ]+$/).optional().or(z.literal("").transform(() => undefined)),
  receiptUrl: httpsUrl.optional(),
  note: optionalLongText,
});

export const orderStatusSchema = z.object({
  status: z.enum(["VALIDATED", "DELIVERED", "CANCELLED", "REFUNDED", "REJECTED"]),
  rejectionReason: longText.optional(),
});

export const orderListQuery = z.object({
  status: z.enum(["PENDING", "VALIDATED", "DELIVERED", "CANCELLED", "REFUNDED", "REJECTED"]).optional(),
  userId: uuid.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ── Retraits ──
export const deliveryCreateSchema = z.object({
  items: z.array(z.object({ productId: uuid, quantity })).min(1).max(50),
  recipientName: shortText.optional(),
  recipientPhone: phone.optional(),
});

export const deliveryStatusSchema = z.object({
  status: z.enum(["APPROVED", "DELIVERED", "REJECTED"]),
  rejectionReason: longText.optional(),
});

export const deliveryTvaSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set"), tva: z.coerce.number().int().min(0).max(1_000_000_000).nullable() }),
  z.object({ action: z.literal("pay"), paymentMethod }),
]);

// ── Stock ──
export const stockLocation = z.enum(["VIRTUEL", "DISPONIBLE", "BUREAU", "ENTREPOT"]);

export const stockMovementSchema = z.object({
  productId: uuid,
  location: stockLocation,
  quantity: z.coerce.number().int().min(-100_000).max(100_000).refine((n) => n !== 0, "Quantité nulle"),
  reason: z.enum(["ADJUSTMENT", "LOSS", "RETURN", "RECEPTION"]),
  note: optionalLongText,
});

export const stockTransferSchema = z
  .object({ productId: uuid, from: stockLocation, to: stockLocation, quantity, note: optionalLongText })
  .refine((v) => v.from !== v.to, { message: "Source et destination identiques" });

export const supplyCreateSchema = z.object({ productId: uuid, quantity, note: optionalLongText });

export const supplyStatusSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("RECEIVED"),
    quantityBureau: z.coerce.number().int().min(0),
    quantityEntrepot: z.coerce.number().int().min(0),
  }),
  z.object({ status: z.literal("CANCELLED") }),
]);

export const conversionSchema = z
  .object({
    clientId: uuid,
    fromProductId: uuid,
    fromQuantity: quantity,
    toProductId: uuid,
    toQuantity: quantity,
    comment: optionalLongText,
  })
  .refine((v) => v.fromProductId !== v.toProductId, { message: "Produits identiques" });

// ── Portefeuille ──
export const walletCreditSchema = z.object({
  userId: uuid,
  amount,
  description: longText.optional(),
  paymentMethod: paymentMethod.optional(),
  proofUrl: httpsUrl.optional(),
});

export const walletTransferSchema = z.object({
  recipientMemberNumber: z.string().trim().min(3).max(30),
  amount,
});

export const walletSearchSchema = z.object({ query: z.string().trim().min(3).max(60) });

export const generalBalanceSchema = z.object({
  type: z.enum(["CREDIT", "DEBIT"]),
  amount,
  description: longText,
});

export const taxTransferSchema = z.object({ amount });

// ── Membres (admin) ──
export const role = z.enum(["SUPER_ADMIN", "ADMIN", "STOCK_MANAGER", "SUPPORT", "CLIENT"]);
export const userStatus = z.enum(["MEMBRE", "INDEPENDANT", "CHEF_EQUIPE"]);

export const adminUserCreateSchema = z.object({
  name: shortText,
  email,
  phone: phone.optional(),
  role: role.default("CLIENT"),
  status: userStatus.default("MEMBRE"),
  officeId: uuid.optional().nullable(),
  sponsorMemberNumber: z.string().trim().max(30).optional(),
});

export const adminUserUpdateSchema = z.object({
  name: shortText.optional(),
  phone: phone.optional().nullable(),
  city: shortText.optional().nullable(),
  role: role.optional(),
  status: userStatus.optional(),
  blocked: z.boolean().optional(),
  officeId: uuid.optional().nullable(),
});

export const permissionsSchema = z.object({
  permissions: z.array(z.object({ slug: z.string().max(40), canView: z.boolean(), canEdit: z.boolean() })).max(30),
});

// ── Bureaux & formations ──
export const officeSchema = z.object({
  name: shortText,
  managerId: uuid,
  country: shortText.default("Côte d'Ivoire"),
  city: shortText.optional().nullable(),
  commune: shortText.optional().nullable(),
  neighborhood: shortText.optional().nullable(),
});

export const formationSchema = z
  .object({
    officeId: uuid,
    type: z.enum(["TRAINING", "CONFERENCE"]),
    title: shortText,
    dayOfWeek: z.coerce.number().int().min(1).max(7).optional().nullable(),
    date: z.coerce.date().optional().nullable(),
    timeSlot: z.string().trim().max(40).optional().nullable(),
    location: shortText.optional().nullable(),
    notes: optionalLongText,
    status: z.enum(["UPCOMING", "IN_PROGRESS", "PAST", "CANCELLED"]).default("UPCOMING"),
  })
  .refine((f) => (f.type === "TRAINING" ? !!f.dayOfWeek : !!f.date), {
    message: "Une formation a un jour de semaine, une conférence a une date.",
  });

// ── Paramètres ──
export const settingsSchema = z.object({
  siteName: shortText.optional(),
  siteEmail: email.optional().nullable(),
  sitePhone: phone.optional().nullable(),
  logo: httpsUrl.optional().nullable(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  allowReceiptSending: z.boolean().optional(),
});
