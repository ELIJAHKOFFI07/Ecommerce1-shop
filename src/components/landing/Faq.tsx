"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Reveal } from "./Reveal";

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

/// FAQ en accordéon : une seule question ouverte à la fois.
export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <Reveal className="mb-10 text-center">
        <p className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-orange">
          On te dit tout
        </p>
        <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Questions fréquentes
        </h2>
      </Reveal>

      <div className="space-y-4">
        {ITEMS.map((item, index) => {
          const open = openIndex === index;
          return (
            <Reveal
              key={item.question}
              delay={index * 0.05}
              className="overflow-hidden rounded-2xl border-2 border-ink bg-paper shadow-hard-sm"
            >
              <div className={open ? "faq-item open" : "faq-item"}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-display text-lg font-bold"
                >
                  {item.question}
                  <ChevronDown className="faq-chevron h-5 w-5 shrink-0" strokeWidth={2.5} />
                </button>
                <div className="faq-panel">
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 leading-relaxed text-ink/70">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
