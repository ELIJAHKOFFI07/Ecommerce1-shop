"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clock } from "lucide-react";
import { Reveal } from "./Reveal";
import { ASSETS } from "./assets";

const INITIAL_SECONDS = 2 * 3600 + 14 * 60 + 37;
const fmt = (n: number) => n.toLocaleString("fr-FR");

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatHMS(total: number) {
  return `${pad(Math.floor(total / 3600))} : ${pad(Math.floor((total % 3600) / 60))} : ${pad(total % 60)}`;
}

/// Carte d'enchère en direct : compte à rebours + surenchère avec
/// prolongation anti-sniping.
export function AuctionCard() {
  const [bid, setBid] = useState(87500);
  const [remaining, setRemaining] = useState(INITIAL_SECONDS);
  const [flash, setFlash] = useState(false);
  const [placed, setPlaced] = useState(false);
  const endRef = useRef(0);

  useEffect(() => {
    endRef.current = Date.now() + INITIAL_SECONDS * 1000;
    const id = setInterval(() => {
      setRemaining(Math.max(0, Math.floor((endRef.current - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleBid = () => {
    setBid((b) => b + 2500);
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
    if (endRef.current - Date.now() < 60000) {
      endRef.current = Date.now() + 60000;
    }
    setPlaced(true);
    setTimeout(() => setPlaced(false), 1500);
  };

  return (
    <div className="mx-auto w-full max-w-md rotate-[-1.5deg] overflow-hidden rounded-blob border-2 border-cream/20 bg-cream text-ink shadow-hard-orange lg:mx-0">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.products.watch}
          alt="Montre chronographe or"
          className="aspect-square w-full object-cover"
        />
        <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full border-2 border-border bg-orange px-3 py-1.5 font-display text-xs font-extrabold uppercase tracking-wider text-white">
          <span className="inline-block h-2 w-2 animate-ping rounded-full bg-white" />
          Enchère en cours
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-extrabold">
              Chronographe « Grand-Bassam »
            </h3>
            <p className="text-sm font-medium text-ink/60">
              Boutique Luxe CI · Abidjan
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink/50">
              Offre actuelle
            </p>
            <p
              className={`font-display text-2xl font-extrabold ${flash ? "text-orange-deep" : "text-vert-deep"}`}
            >
              {fmt(bid)} F
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-ink p-4 text-cream">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-cream/50">
              Temps restant
            </p>
            <p className="font-display text-2xl font-extrabold tabular-nums">
              {formatHMS(remaining)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleBid}
            className="rounded-full border-2 border-sun bg-sun px-5 py-3 font-display text-sm font-extrabold text-ink transition-all hover:border-border hover:bg-orange hover:text-white"
          >
            {placed ? "Offre placée !" : "+ 2 500 F"}
          </button>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-ink/50">
          <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
          Anti-sniping : toute enchère en dernière minute prolonge le compte à
          rebours.
        </p>
      </div>
    </div>
  );
}

/// Section enchères : carte live + présentation du dispositif.
export function Auctions() {
  return (
    <section
      id="encheres"
      className="relative overflow-hidden bg-ink py-16 text-cream sm:py-24"
    >
      <div className="pointer-events-none absolute -top-20 right-0 h-96 w-96 rounded-full bg-vert/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-orange/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal className="order-2 lg:order-1">
            <AuctionCard />
          </Reveal>

          <Reveal className="order-1 lg:order-2">
            <p className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-sun">
              Monte les enchères
            </p>
            <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Les pépites partent
              <br />
              aux <span className="text-orange">plus offrants</span>.
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-cream/70">
              Chaque jour, des vendeurs mettent leurs meilleures pièces aux
              enchères. Compte à rebours en direct, surenchère minimale, et
              prolongation automatique anti-sniping pour que tout le monde joue
              à armes égales.
            </p>
            <div className="mt-8 grid max-w-lg gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border-2 border-cream/15 bg-cream/5 p-4">
                <p className="font-display text-3xl font-extrabold text-sun">
                  24/7
                </p>
                <p className="text-sm font-medium text-cream/60">
                  des enchères actives en continu
                </p>
              </div>
              <div className="rounded-2xl border-2 border-cream/15 bg-cream/5 p-4">
                <p className="font-display text-3xl font-extrabold text-sun">
                  +60 s
                </p>
                <p className="text-sm font-medium text-cream/60">
                  de prolongation anti-sniping
                </p>
              </div>
            </div>
            <a
              href="#catalogue"
              className="mt-8 inline-flex items-center gap-2 rounded-full border-2 border-cream/0 bg-orange px-7 py-4 font-display text-lg font-bold text-white transition-all hover:border-cream"
            >
              Voir les enchères du jour
              <Check className="h-5 w-5" strokeWidth={2.5} />
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
