import {
  BadgeCheck,
  Headset,
  Lock,
  PackageCheck,
  type LucideIcon,
} from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { IconBadge } from "./Primitives";

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Lock,
    title: "Paiement protégé",
    text: "Montants calculés et validés côté serveur. Aucune mauvaise surprise.",
  },
  {
    icon: PackageCheck,
    title: "Code de retrait unique",
    text: "Chaque colis reçoit un code à 6 chiffres : seul le bon destinataire repart avec.",
  },
  {
    icon: BadgeCheck,
    title: "Avis vérifiés",
    text: "Notes et questions-réponses publics sur chaque fiche produit.",
  },
  {
    icon: Headset,
    title: "Support 7 j/7",
    text: "Une équipe basée à Abidjan, en français, sur WhatsApp ou dans l'app.",
  },
];

/// Section confiance : quatre engagements, cartes minimales (aplat `bg-surface`,
/// sans bordure ni grand arrondi). L'icône porte la couleur d'accent.
export function Trust() {
  return (
    <Section>
      <SectionHeading
        title="Pensé pour être sûr"
        subtitle="Du clic au colis, sans stress."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <Card key={feature.title} className="p-6">
            <IconBadge>
              <feature.icon className="h-5 w-5" strokeWidth={2} />
            </IconBadge>
            <h3 className="mt-4 text-lg font-medium">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {feature.text}
            </p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
