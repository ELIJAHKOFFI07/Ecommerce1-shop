import { ChevronDown } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";

const ITEMS: { question: string; answer: string }[] = [
  {
    question: "Faut-il un compte pour acheter ?",
    answer:
      "Non ! Tu peux explorer tout le catalogue, comparer et même remplir ton panier sans compte. La connexion n'est demandée qu'au moment de valider la commande — et ton panier est conservé.",
  },
  {
    question: "Comment fonctionne la négociation ?",
    answer:
      "Sur un produit « négociable », tu proposes un prix entre 50 % et 100 % du prix affiché. Le vendeur est notifié instantanément : il accepte, refuse, ou vous discutez en messagerie. Une fois acceptée, l'offre s'applique directement à ta commande.",
  },
  {
    question: "Quels moyens de paiement sont acceptés ?",
    answer:
      "Orange Money, MTN MoMo, Moov Money et Wave en priorité, mais aussi la carte bancaire et le paiement à la livraison (cash à la réception du colis). À toi de choisir à chaque commande.",
  },
  {
    question: "Comment je récupère mon colis ?",
    answer:
      "Chaque colis reçoit un code de retrait unique à 6 chiffres, visible dans ton suivi de commande. Tu le présentes au livreur ou au point de retrait — simple et sécurisé.",
  },
  {
    question: "C'est quoi le parrainage DreamTeam ?",
    answer:
      "Invite tes proches avec ton lien : tu gagnes 200 points par filleul, et lui 100 points de bienvenue. Les points se convertissent en bons d'achat et en tirages à la roue de la chance.",
  },
];

/// FAQ en accordéon natif <details>/<summary> : aucune dépendance JS, aucune
/// animation, accessible par défaut (clavier + lecteur d'écran). Le chevron
/// pivote via la pseudo-classe `open` du groupe.
export function Faq() {
  return (
    <Section>
      <SectionHeading
        title="Questions fréquentes"
        subtitle="On vous dit tout."
      />
      <div className="mx-auto max-w-3xl space-y-2">
        {ITEMS.map((item) => (
          <details key={item.question} className="group rounded-sm bg-surface px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium">
              {item.question}
              <ChevronDown
                className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180"
                strokeWidth={2}
              />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{item.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
