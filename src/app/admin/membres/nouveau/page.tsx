import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
      <Link href="/admin/membres" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Membres
      </Link>
      <PageTitle title="Créer un compte" subtitle="Un mot de passe temporaire sera envoyé par e-mail à la personne." />
      <NewMemberForm offices={offices} isSuperAdmin={user.role === "SUPER_ADMIN"} />
    </div>
  );
}
