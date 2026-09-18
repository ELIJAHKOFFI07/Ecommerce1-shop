import { pageModule } from "@/lib/pageAuth";
import { PageTitle } from "@/components/ui";
import { NewUserForm } from "./NewUserForm";

export default async function NewUserPage() {
  const { user } = await pageModule("users", "edit");
  return (
    <div className="mx-auto max-w-xl">
      <PageTitle title="Créer un utilisateur" subtitle="Un mot de passe temporaire lui sera envoyé par e-mail." />
      <NewUserForm isSuperAdmin={user.role === "SUPER_ADMIN"} />
    </div>
  );
}
