import { pageUser } from "@/lib/pageAuth";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await pageUser("/compte");
  return <>{children}</>;
}
