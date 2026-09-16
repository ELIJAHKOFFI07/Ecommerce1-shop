import { pageUser } from "@/lib/pageAuth";
import { MemberNav } from "./MemberNav";

/// Espace membre : une barre d'onglets, six entrées, libellés en un mot.
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  await pageUser("/espace");
  return (
    <div className="space-y-6">
      <MemberNav />
      {children}
    </div>
  );
}
