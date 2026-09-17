"use client";

import { Printer } from "lucide-react";
import { Button } from "./ui";

export function PrintButton() {
  return (
    <Button onClick={() => window.print()}>
      <Printer className="h-4 w-4" aria-hidden /> Imprimer / Enregistrer en PDF
    </Button>
  );
}
