"use client";

import { useRef, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { Reveal } from "./Reveal";

const PRIZES = [
  "500 points fidélité !",
  "Bon d'achat de 2 000 F !",
  "−10 % sur ta prochaine commande !",
  "Rejoue demain !",
  "1 000 points fidélité !",
  "−5 % chez une boutique partenaire !",
];

const SLICE = 360 / PRIZES.length;

/// Teinte et couleur de texte de chaque part (6 parts de 60°, alignées sur la
/// logique de tirage) : une teinte distincte par part — tokens de l'identité
/// (orange, sun, vert) complétés par la palette Tailwind (bleu, rouge, violet)
/// pour que les segments voisins ne se ressemblent jamais. Le foreground suit
/// la teinte (texte clair sur accent vif, encre sur sun).
const SEGMENTS: { bg: string; fg: string }[] = [
  { bg: "var(--orange)", fg: "var(--primary-foreground)" },
  { bg: "var(--color-blue-500)", fg: "white" },
  { bg: "var(--sun)", fg: "var(--ink)" },
  { bg: "var(--color-red-500)", fg: "white" },
  { bg: "var(--vert)", fg: "var(--secondary-foreground)" },
  { bg: "var(--color-purple-500)", fg: "white" },
];

/// Libellés courts : valeur en grand caractère, unité réduite et grisée en
/// dessous.
const LABELS: { value: string; unit: string }[] = [
  { value: "500", unit: "pts" },
  { value: "2 000", unit: "F" },
  { value: "−10%", unit: "coupon" },
  { value: "Rejoue", unit: "demain" },
  { value: "1 000", unit: "pts" },
  { value: "−5%", unit: "coupon" },
];

/// Rayon auquel le centre de chaque libellé se pose, en pixels — près du bord
/// de la roue, entre moyeu et contour.
const LABEL_RADIUS = 100;

const WHEEL_GRADIENT = `conic-gradient(${SEGMENTS.map(
  (s, i) => `${s.bg} ${i * SLICE}deg ${(i + 1) * SLICE}deg`,
).join(", ")})`;

/// Roue de la chance : rotation animée puis révélation du gain.
export function Wheel() {
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState("");
  const rotation = useRef(0);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult("");
    const seg = Math.floor(Math.random() * PRIZES.length);
    rotation.current += 360 * 5 + (360 - seg * 60) + (Math.random() * 30 - 15);
    if (wheelRef.current) {
      wheelRef.current.style.transform = `rotate(${rotation.current}deg)`;
    }
    setTimeout(() => {
      setResult(PRIZES[seg]);
      setSpinning(false);
    }, 5100);
  };

  return (
    <Reveal className="flex flex-col items-center">
      <div className="relative h-72 w-72 sm:h-80 sm:w-80">
        <div className="absolute -top-3 left-1/2 z-20 h-0 w-0 -translate-x-1/2 border-l-[16px] border-r-[16px] border-t-[26px] border-l-transparent border-r-transparent border-t-sun drop-shadow-[0_2px_0_rgba(23,17,11,1)]" />
        <div
          id="wheel"
          ref={wheelRef}
          className="relative h-full w-full overflow-hidden rounded-full border-4 border-border shadow-hard"
          style={{ background: WHEEL_GRADIENT }}
        >
          {PRIZES.map((_, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 flex w-28 flex-col items-center text-center leading-none"
              style={{
                // Centre le libellé sur la roue, le pousse le long du rayon
                // puis fait orbiter autour du centre : chaque texte se pose
                // au milieu de sa part.
                transform: `translate(-50%, -50%) rotate(${i * SLICE + SLICE / 2}deg) translateY(-${LABEL_RADIUS}px)`,
                color: SEGMENTS[i].fg,
              }}
            >
              <span className="whitespace-nowrap font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                {LABELS[i].value}
              </span>
              <span className="mt-1 whitespace-nowrap font-display text-[10px] font-bold uppercase tracking-widest opacity-70 sm:text-xs">
                {LABELS[i].unit}
              </span>
            </span>
          ))}
        </div>
        <div className="absolute inset-0 z-10 m-auto grid h-16 w-16 place-items-center rounded-full border-4 border-border bg-paper">
          <ShoppingBag className="h-7 w-7 text-orange" strokeWidth={2.4} />
        </div>
      </div>

      <button
        type="button"
        onClick={spin}
        disabled={spinning}
        className="card-hard mt-8 rounded-full bg-sun px-8 py-4 font-display text-lg font-extrabold text-ink transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        Tourner la roue
      </button>
      <p className="mt-4 h-7 font-display text-lg font-bold text-sun">
        {result}
      </p>
    </Reveal>
  );
}
