"use client";

import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/// Bouton « Retour » présent sur tous les écrans sauf les racines.
/// Revient à la page précédente ; s'il n'y en a pas (lien ouvert
/// directement), remonte d'un niveau dans l'adresse.
export function BackBar({ roots }: { roots: string[] }) {
  const router = useRouter();
  const path = usePathname();
  if (roots.includes(path)) return null;

  function back() {
    if (window.history.length > 1) router.back();
    else router.push(path.split("/").slice(0, -1).join("/") || "/");
  }

  return (
    <div className="mb-4 print:hidden">
      <button type="button" onClick={back} className="press inline-flex h-10 cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Retour
      </button>
    </div>
  );
}
