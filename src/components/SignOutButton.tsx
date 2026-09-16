"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className={`cursor-pointer rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground ${className}`}>
      Déconnexion
    </button>
  );
}
