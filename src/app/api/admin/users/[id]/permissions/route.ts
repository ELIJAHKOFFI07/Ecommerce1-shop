import { db, TX } from "@/lib/db";
import { withApi, parseBody, ok, ApiError } from "@/lib/apiError";
import { requireSuperAdmin, MODULES } from "@/lib/requireAuth";
import { permissionsSchema, uuid } from "@/lib/validators";
import { audit } from "@/lib/audit";

/// Permissions fines : réservées au SUPER_ADMIN (un admin ne s'accorde pas
/// de droits). Les modules sont créés à la volée depuis la liste MODULES,
/// source de vérité unique.
export const PUT = withApi<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireSuperAdmin();
  const id = uuid.parse((await params).id);
  const { permissions } = await parseBody(req, permissionsSchema);
  const known = new Set(MODULES.map((m) => m.slug));
  for (const p of permissions) if (!known.has(p.slug as never)) throw new ApiError(400, `Module inconnu : ${p.slug}`);

  await db.$transaction(async (tx) => {
    for (const m of MODULES) {
      await tx.module.upsert({ where: { slug: m.slug }, create: m, update: { name: m.name, description: m.description } });
    }
    const modules = await tx.module.findMany({ select: { id: true, slug: true } });
    await tx.userPermission.deleteMany({ where: { userId: id } });
    await tx.userPermission.createMany({
      data: permissions
        .filter((p) => p.canView || p.canEdit)
        .map((p) => ({ userId: id, moduleId: modules.find((m) => m.slug === p.slug)!.id, canView: p.canView || p.canEdit, canEdit: p.canEdit })),
    });
  }, TX);

  await audit("user.permissions_changed", { userId: admin.id, target: id, req, meta: { permissions } });
  return ok({ ok: true });
});
