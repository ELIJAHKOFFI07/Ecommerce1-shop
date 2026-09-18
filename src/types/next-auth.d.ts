import type { DefaultSession } from "next-auth";
import type { Role } from "../../prisma/generated/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      blocked: boolean;
    } & DefaultSession["user"];
  }
  interface User {
    role?: Role;
    blocked?: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    blocked: boolean;
    checkedAt: number;
  }
}
