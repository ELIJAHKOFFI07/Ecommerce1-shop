"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";
import { ASSETS } from "./assets";

const PRICE = 60000;
const MIN = PRICE * 0.5;
const OFFERS = [25000, 40000, 48000, 55000];

const fmt = (n: number) => n.toLocaleString("fr-FR");

type Message = { text: string; mine: boolean };

/// Simulateur de négociation : proposer un prix déclenche la réponse du
/// vendeur (avec indicateur « en train d'écrire »).
export function NegotiationDemo() {
  const [messages, setMessages] = useState<Message[]>([
    { text: "Bienvenue ! Ces sneakers te plaisent ? Tu peux me faire une offre.", mine: false },
  ]);
  const [typing, setTyping] = useState(false);
  const dealDone = useRef(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages, typing]);

  const vendorReply = (cb: () => void) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      cb();
    }, 1250);
  };

  const addBubble = (text: string, mine: boolean) =>
    setMessages((prev) => [...prev, { text, mine }]);

  const handleOffer = (offer: number) => {
    if (dealDone.current) {
      addBubble(
        "Le deal est déjà conclu à 52 000 F ! Recharge la page pour rejouer.",
        false,
      );
      return;
    }
    addBubble(`Je te propose ${fmt(offer)} F, ça te va ?`, true);
    vendorReply(() => {
      if (offer < MIN) {
        addBubble(
          `Ah non, en dessous de ${fmt(MIN)} F ce n'est pas possible, la plateforme n'accepte que 50 % à 100 % du prix affiché.`,
          false,
        );
      } else if (offer >= 52000) {
        addBubble(
          `C'est un beau geste. Allez, vendu à ${fmt(offer)} F ! Ton offre est appliquée au panier.`,
          false,
        );
        addBubble(`✔ Offre acceptée — ${fmt(offer)} F`, false);
        dealDone.current = true;
      } else if (offer >= 45000) {
        addBubble(
          "Tu n'es pas loin… dis 52 000 F et on conclut tout de suite.",
          false,
        );
      } else {
        addBubble(
          "C'est un peu léger pour ce modèle. Je peux descendre jusqu'à 52 000 F, c'est mon meilleur prix.",
          false,
        );
      }
    });
  };

  return (
    <Reveal>
      <div className="card-hard mx-auto w-full max-w-md overflow-hidden rounded-blob bg-card">
        <div className="flex items-center gap-3 bg-foreground px-5 py-4 text-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ASSETS.products.sneakers}
            alt="Sneakers Air Fusion"
            className="h-11 w-11 rounded-xl border-2 border-background/30 object-cover"
          />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold">
              Boutique « Abidjan Kicks »
            </p>
            <p className="flex items-center gap-1.5 text-xs text-background/60">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-secondary" />
              En ligne · répond vite
            </p>
          </div>
          <span className="ml-auto shrink-0 text-right">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-background/50">
              Prix affiché
            </span>
            <span className="font-display text-sun font-extrabold">
              60 000 F
            </span>
          </span>
        </div>

        <div
          ref={boxRef}
          className="h-72 space-y-3 overflow-y-auto bg-background/60 p-4"
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`bubble ${msg.mine ? "bubble-me" : "bubble-vendor"}`}
            >
              {msg.text}
            </div>
          ))}
          {typing && (
            <div className="bubble bubble-vendor flex items-center gap-1.5">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          )}
        </div>

        <div className="border-t-2 border-border/10 p-4">
          <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-foreground/50">
            Propose ton prix (essaye !)
          </p>
          <div className="flex flex-wrap gap-2">
            {OFFERS.map((offer) => (
              <button
                key={offer}
                type="button"
                onClick={() => handleOffer(offer)}
                className="card-hard-sm rounded-full bg-card px-4 py-2 font-display text-sm font-bold transition-colors hover:bg-sun"
              >
                {fmt(offer)} F
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-sm font-medium text-foreground/50">
        Démo interactive — dans l&apos;app, ça se passe exactement comme ça.
      </p>
    </Reveal>
  );
}
