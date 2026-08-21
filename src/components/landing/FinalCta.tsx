import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section } from "@/components/ui/Section";

/// Dernier appel à l'action : bannière pleine largeur sur fond encre. Les
/// boutons y sont inversés (clair sur fond sombre) pour rester lisibles.
export function FinalCta() {
  return (
    <Section>
      <div className="rounded-sm bg-foreground px-6 py-16 text-center text-background sm:px-10">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Votre prochaine bonne affaire vous attend.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-background/70">
          Rejoignez des milliers d&apos;Ivoiriens qui achètent malin, vendent
          facile et négocient chaque jour.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/play/search"
            className="inline-flex items-center gap-2 rounded-sm bg-background px-6 py-3 text-base font-medium text-foreground hover:bg-background/90"
          >
            Explorer le catalogue
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
          <Link
            href="/play/sell"
            className="inline-flex items-center gap-2 rounded-sm border border-background/30 px-6 py-3 text-base font-medium text-background hover:bg-background/10"
          >
            Devenir vendeur
          </Link>
        </div>
      </div>
    </Section>
  );
}
