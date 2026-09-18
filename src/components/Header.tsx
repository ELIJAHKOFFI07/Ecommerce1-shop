import { auth } from "@/lib/auth";
import { HeaderNav } from "./HeaderNav";

export async function Header() {
  const session = await auth();
  const user = session?.user;
  const isStaff = Boolean(user && ["SUPER_ADMIN", "ADMIN", "STOCK_MANAGER", "SUPPORT"].includes(user.role));
  return <HeaderNav user={user ? { name: user.name ?? "", email: user.email ?? "", isStaff } : null} />;
}
