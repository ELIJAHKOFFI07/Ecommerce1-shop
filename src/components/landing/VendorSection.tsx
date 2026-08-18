import { Send, Wallet, MessagesSquare } from "lucide-react";
import { Reveal } from "./Reveal";
import { Marker } from "./Marker";
import { CtaButton, FloatingCard, IconBadge } from "./Primitives";
import { ASSETS } from "./assets";

const FEATURES = [
  {
    tone: "orange-soft" as const,
    icon: <Wallet className="h-5 w-5 text-orange-deep" />,
    title: "Portefeuille & retrait Mobile Money",
    text: "Tes ventes sont crédités instantanément. Retire quand tu veux, dès le seuil atteint.",
  },
  {
    tone: "vert-soft" as const,
    icon: <Send className="h-5 w-5 text-vert-deep" />,
    title: "Visibilité boostée",
    text: "Stories, boost produit, mise en vedette dans le fil de nouveautés de ta ville.",
  },
  {
    tone: "sun" as const,
    icon: <MessagesSquare className="h-5 w-5 text-ink" />,
    title: "Offres gérées en un clin d'œil",
    text: "Reçois les propositions de prix, accepte ou refuse, discute en direct.",
  },
];

/// Section vendeurs : visuel boutique + argumentaire avec appel à l'action.
export function VendorSection() {
  return (
    <section id="vendre" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <Reveal className="relative">
          <div className="card-hard rotate-[1.5deg] overflow-hidden rounded-blob">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ASSETS.seller}
              alt="Vendeur ivoirien dans sa boutique avec son téléphone"
              className="block h-auto w-full"
            />
          </div>
          <FloatingCard
            rotation={-3}
            className="card-hard-sm -bottom-6 -left-2 rounded-2xl bg-paper px-5 py-4 sm:left-6"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink/50">
              Portefeuille vendeur
            </p>
            <p className="font-display text-2xl font-extrabold text-vert-deep">
              + 342 500 F{" "}
              <span className="text-sm font-bold text-ink/40">ce mois</span>
            </p>
          </FloatingCard>
        </Reveal>

        <Reveal>
          <p className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-orange">
            Pour les vendeurs
          </p>
          <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Ta boutique,
            <br />
            ta{" "}
            <Marker variant="orange">
              <span className="text-white">régie</span>
            </Marker>
            .
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink/70">
            Que tu vendes depuis ta boutique physique, ton salon ou ton garage :
            DreamTeamShop te donne une vitrine pro, des clients proches et un
            vrai outil de gestion.
          </p>
          <ul className="mt-8 max-w-lg space-y-4">
            {FEATURES.map((feature) => (
              <li
                key={feature.title}
                className="card-hard-sm flex items-start gap-4 rounded-2xl bg-paper p-4"
              >
                <IconBadge tone={feature.tone} size="md" className="rounded-xl">
                  {feature.icon}
                </IconBadge>
                <div>
                  <p className="font-display font-bold">{feature.title}</p>
                  <p className="text-sm text-ink/60">{feature.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <CtaButton href="#catalogue" variant="vert" size="lg" className="mt-8">
            Ouvrir ma boutique gratuitement
          </CtaButton>
        </Reveal>
      </div>
    </section>
  );
}