import { db } from "@/lib/db";
import { pageUser } from "@/lib/pageAuth";
import { Card, PageTitle, Row, fmtDate } from "@/components/ui";
import { ProfileForm, PasswordForm } from "./forms";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const me = await pageUser("/compte/profil");
  const u = await db.user.findUniqueOrThrow({ where: { id: me.id }, select: { name: true, email: true, phone: true, createdAt: true } });
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageTitle title="Mon profil" />
      <Card className="px-5 py-2"><Row label="E-mail" value={u.email} /><Row label="Client depuis" value={fmtDate(u.createdAt)} /></Card>
      <section><h2 className="mb-3 font-semibold">Mes informations</h2><ProfileForm initial={{ name: u.name, phone: u.phone ?? "" }} /></section>
      <section><h2 className="mb-3 font-semibold">Changer de mot de passe</h2><PasswordForm /></section>
    </div>
  );
}
