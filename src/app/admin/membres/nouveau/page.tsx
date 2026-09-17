import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { pageModule } from "@/lib/pageAuth";
import { PageTitle } from "@/components/ui";
import { NewMemberForm } from "./NewMemberForm";

export const dynamic = "force-dynamic";

export default async function NewMemberPage() {
  const { user, canEdit } = await pageModule("users");
  if (!canEdit) redirect("/admin/membres");
  const offices = await db.office.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Créer un compte" subtitle="Un mot de passe temporaire sera envoyé par e-mail à la personne." />
      <NewMemberForm offices={offices} isSuperAdmin={user.role === "SUPER_ADMIN"} />
    </div>
  );
}
