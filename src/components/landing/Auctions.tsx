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
    <div className="mx-auto w-full max-w-md rotate-[-1.5deg] overflow-hidden rounded-blob border-2 border-background/20 bg-background text-foreground shadow-hard-orange lg:mx-0">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.products.watch}
          alt="Montre chronographe or"
          className="aspect-square w-full object-cover"
        />
        <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full border-2 border-border bg-primary px-3 py-1.5 font-display text-xs font-extrabold uppercase tracking-wider text-primary-foreground">
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
            <p className="text-sm font-medium text-foreground/60">
              Boutique Luxe CI · Abidjan
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">
              Offre actuelle
            </p>
            <p
              className={`font-display text-2xl font-extrabold ${flash ? "text-accent-dark" : "text-vert-deep"}`}
            >
              {fmt(bid)} F
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-foreground p-4 text-background">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-background/50">
              Temps restant
            </p>
            <p className="font-display text-2xl font-extrabold tabular-nums">
              {formatHMS(remaining)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleBid}
            className="rounded-full border-2 border-sun bg-sun px-5 py-3 font-display text-sm font-extrabold text-foreground transition-all hover:border-border hover:bg-primary hover:text-primary-foreground"
          >
            {placed ? "Offre placée !" : "+ 2 500 F"}
          </button>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-foreground/50">
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
      className="relative overflow-hidden bg-foreground py-16 text-background sm:py-24"
    >
      <div className="pointer-events-none absolute -top-20 right-0 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />

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
              aux <span className="text-primary">plus offrants</span>.
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-background/70">
              Chaque jour, des vendeurs mettent leurs meilleures pièces aux
              enchères. Compte à rebours en direct, surenchère minimale, et
              prolongation automatique anti-sniping pour que tout le monde joue
              à armes égales.
            </p>
            <div className="mt-8 grid max-w-lg gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border-2 border-background/15 bg-background/5 p-4">
                <p className="font-display text-3xl font-extrabold text-sun">
                  24/7
                </p>
                <p className="text-sm font-medium text-background/60">
                  des enchères actives en continu
                </p>
              </div>
              <div className="rounded-2xl border-2 border-background/15 bg-background/5 p-4">
                <p className="font-display text-3xl font-extrabold text-sun">
                  +60 s
                </p>
                <p className="text-sm font-medium text-background/60">
                  de prolongation anti-sniping
                </p>
              </div>
            </div>
            <a
              href="#catalogue"
              className="mt-8 inline-flex items-center gap-2 rounded-full border-2 border-background/0 bg-primary px-7 py-4 font-display text-lg font-bold text-primary-foreground transition-all hover:border-background"
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
