import type { DefaultSession } from "next-auth";
import type { Role, UserStatus } from "../../prisma/generated/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      status: UserStatus;
      blocked: boolean;
      memberNumber: string;
    } & DefaultSession["user"];
  }
  interface User {
    role?: Role;
    status?: UserStatus;
    blocked?: boolean;
    memberNumber?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    status: UserStatus;
    blocked: boolean;
    memberNumber: string;
    checkedAt: number;
  }
}
