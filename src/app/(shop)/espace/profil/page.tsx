import { db } from "@/lib/db";
import { pageUser } from "@/lib/pageAuth";
import { Card, PageTitle, Row, fmtDate } from "@/components/ui";
import { ProfileForm, PasswordForm } from "./forms";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const me = await pageUser("/espace/profil");
  const u = await db.user.findUniqueOrThrow({
    where: { id: me.id },
    select: { name: true, pseudo: true, email: true, phone: true, city: true, memberNumber: true, status: true, createdAt: true, sponsor: { select: { name: true, memberNumber: true } }, _count: { select: { referrals: true } } },
  });
  const STATUS = { MEMBRE: "Membre", INDEPENDANT: "Indépendant", CHEF_EQUIPE: "Chef d’équipe" }[u.status];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageTitle title="Mon profil" />
      <Card className="px-5 py-2">
        <Row label="Numéro de membre" value={<span className="font-display text-xl">{u.memberNumber}</span>} />
        <Row label="Statut" value={STATUS} />
        <Row label="E-mail" value={u.email} />
        <Row label="Parrain" value={u.sponsor ? `${u.sponsor.name} (${u.sponsor.memberNumber})` : "—"} />
        <Row label="Filleuls" value={u._count.referrals} />
        <Row label="Membre depuis" value={fmtDate(u.createdAt)} />
      </Card>
      <section>
        <h2 className="mb-3 font-semibold">Mes informations</h2>
        <ProfileForm initial={{ name: u.name, pseudo: u.pseudo ?? "", phone: u.phone ?? "", city: u.city ?? "" }} />
      </section>
      <section>
        <h2 className="mb-3 font-semibold">Changer de mot de passe</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
