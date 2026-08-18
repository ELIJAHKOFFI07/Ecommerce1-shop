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

const WHEEL_GRADIENT = `conic-gradient(var(--orange) 0deg 45deg, var(--cream) 45deg 90deg, var(--sun) 90deg 135deg, var(--cream) 135deg 180deg, var(--vert) 180deg 225deg, var(--cream) 225deg 270deg, var(--orange) 270deg 315deg, var(--cream) 315deg 360deg)`;

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
          <span className="absolute left-1/2 top-[8%] -translate-x-1/2 font-display text-xs font-extrabold text-white sm:text-sm">
            500 pts
          </span>
          <span className="absolute right-[6%] top-[30%] rotate-45 font-display text-xs font-extrabold text-ink sm:text-sm">
            −10%
          </span>
          <span className="absolute bottom-[8%] left-1/2 -translate-x-1/2 rotate-180 font-display text-xs font-extrabold text-white sm:text-sm">
            1 000 pts
          </span>
          <span className="absolute left-[6%] top-[30%] -rotate-45 font-display text-xs font-extrabold text-ink sm:text-sm">
            Bon 2 000 F
          </span>
          <span className="absolute bottom-[30%] right-[8%] -rotate-45 font-display text-xs font-extrabold text-ink sm:text-sm">
            Rejoue
          </span>
          <span className="absolute bottom-[30%] left-[8%] rotate-45 font-display text-xs font-extrabold text-ink sm:text-sm">
            −5%
          </span>
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
