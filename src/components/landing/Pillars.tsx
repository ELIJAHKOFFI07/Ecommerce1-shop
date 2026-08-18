import type { ReactNode } from "react";
import { Check, MessageCircle, ShoppingCart, Store } from "lucide-react";
import { Reveal } from "./Reveal";
import { Marker } from "./Marker";
import { IconBadge } from "./Primitives";

type PillarTone = "paper" | "ink" | "vert";

const PILLAR_TONES: Record<PillarTone, string> = {
  paper: "bg-paper text-ink shadow-hard-sm",
  ink: "bg-ink text-cream shadow-hard-orange",
  vert: "bg-vert text-white shadow-hard-sm",
};

function PillarCard({
  index,
  tone,
  icon,
  title,
  body,
  footnote,
  footnoteTone,
  delay = 0,
}: {
  index: number;
  tone: PillarTone;
  icon: ReactNode;
  title: string;
  body: string;
  footnote: string;
  footnoteTone: string;
  delay?: number;
}) {
  const bodyTone =
    tone === "ink" ? "text-cream/70" : tone === "vert" ? "text-white/80" : "text-ink/70";
  const ghostTone =
    tone === "ink" ? "text-cream/10" : tone === "vert" ? "text-white/15" : "text-orange-soft";

  return (
    <Reveal
      delay={delay}
      as="article"
      className={`card-hover relative overflow-hidden rounded-blob border-2 border-border p-8 ${PILLAR_TONES[tone]}`}
    >
      <span className={`absolute -right-3 -top-3 select-none font-display text-[7rem] font-extrabold leading-none ${ghostTone}`}>
        {index}
      </span>
      <IconBadge size="lg" tone={tone === "paper" ? "orange" : tone === "ink" ? "sun" : "white"} className="relative mb-6">
        {icon}
      </IconBadge>
      <h3 className="relative font-display text-2xl font-extrabold">{title}</h3>
      <p className={`relative leading-relaxed ${bodyTone}`}>{body}</p>
      <p className={`relative mt-4 inline-flex items-center gap-1.5 text-sm font-bold ${footnoteTone}`}>
        <Check className="h-4 w-4" strokeWidth={2.5} />
        {footnote}
      </p>
    </Reveal>
  );
}

/// Les trois façons de faire des affaires : acheter, négocier, vendre.
export function Pillars() {
  return (
    <section id="piliers" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24">
      <Reveal className="mx-auto mb-12 max-w-2xl text-center">
        <p className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-orange">
          Comment ça marche
        </p>
        <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Trois façons de faire
          <br />
          de <Marker variant="orange"><span className="text-white">bonnes affaires</span></Marker>
        </h2>
      </Reveal>

      <div className="grid gap-6 md:grid-cols-3">
        <PillarCard
          index={1}
          tone="paper"
          icon={<ShoppingCart className="h-7 w-7 text-white" />}
          title="Achète sans friction"
          body="Parcours tout le catalogue, compare les produits, crée tes wishlists — sans créer de compte. La connexion n'est demandée qu'au moment de commander."
          footnote="Panier conservé même après connexion"
          footnoteTone="text-orange-deep"
        />
        <PillarCard
          index={2}
          tone="ink"
          icon={<MessageCircle className="h-7 w-7 text-ink" />}
          title="Négocie le prix"
          body="Propose ton prix — entre 50 % et 100 % du prix affiché — directement au vendeur. Il accepte, refuse, ou vous en discutez en messagerie instantanée."
          footnote="Discussion en direct avec le vendeur"
          footnoteTone="text-sun"
          delay={0.1}
        />
        <PillarCard
          index={3}
          tone="vert"
          icon={<Store className="h-7 w-7 text-vert-deep" />}
          title="Vends et encaisse"
          body="Ouvre ta boutique, publie tes produits avec photos et variantes, et retire tes gains en Mobile Money depuis ton portefeuille vendeur."
          footnote="Retrait Mobile Money en quelques clics"
          footnoteTone="text-white"
          delay={0.2}
        />
      </div>
    </section>
  );
}
