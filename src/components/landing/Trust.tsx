import { BadgeCheck, Headset, Lock, PackageCheck } from "lucide-react";
import { Reveal } from "./Reveal";
import { Marker } from "./Marker";

const FEATURES = [
  {
    tone: "ink" as const,
    icon: <Lock className="h-6 w-6 text-sun" />,
    title: "Paiement protégé",
    text: "Chaque montant est calculé et validé côté serveur. Aucune mauvaise surprise, jamais.",
  },
  {
    tone: "orange" as const,
    icon: <PackageCheck className="h-6 w-6 text-primary-foreground" />,
    title: "Code de retrait unique",
    text: "Chaque colis reçoit un code à 6 chiffres : seul le bon destinataire repart avec.",
  },
  {
    tone: "vert" as const,
    icon: <BadgeCheck className="h-6 w-6 text-secondary-foreground" />,
    title: "Avis vérifiés",
    text: "Notes, avis et questions-réponses publics sur chaque fiche produit. La transparence d'abord.",
  },
  {
    tone: "sun" as const,
    icon: <Headset className="h-6 w-6 text-foreground" />,
    title: "Support 7 j/7",
    text: "Une équipe basée à Abidjan qui te répond en français, sur WhatsApp ou dans l'app.",
  },
];

/// Section confiance : quatre engagements clés.
export function Trust() {
  return (
    <section id="confiance" className="border-y-2 border-border bg-card py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-secondary">
            Zéro stress
          </p>
          <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Pensé pour être{" "}
            <Marker variant="vert">
              <span>sûr</span>
            </Marker>
            ,
            <br />
            du clic au colis.
          </h2>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => {
            const toneClass =
              feature.tone === "ink"
                ? "bg-foreground text-sun"
                : feature.tone === "orange"
                  ? "bg-primary text-primary-foreground"
                  : feature.tone === "vert"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-sun text-foreground";
            return (
              <Reveal
                key={feature.title}
                delay={i * 0.07}
                className="card-hard-sm rounded-3xl bg-background p-6"
              >
                <span
                  className={`mb-4 grid h-12 w-12 place-items-center rounded-xl ${toneClass}`}
                >
                  {feature.icon}
                </span>
                <h3 className="mb-2 font-display text-lg font-extrabold">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-foreground/60">
                  {feature.text}
                </p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}