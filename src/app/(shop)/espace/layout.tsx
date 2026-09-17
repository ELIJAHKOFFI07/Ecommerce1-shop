import { pageUser } from "@/lib/pageAuth";

/// Espace membre : la navigation est dans l'en-tête commun (HeaderNav).
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  await pageUser("/espace");
  return <>{children}</>;
}
