"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

/// Compteur qui s'incrémente lorsqu'il entre dans le champ de vision.
///
/// Le chiffre est une information, pas une décoration : si le visiteur a
/// demandé à réduire les animations, la valeur finale est affichée
/// directement plutôt que d'être atteinte par un décompte.
export function CountUp({
  to,
  suffix = "",
  duration = 1400,
}: {
  to: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const reducedMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion) return;

    let frame = 0;
    let started = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started) return;
        started = true;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          // Décélération : un décompte qui ralentit en fin de course se lit
          // mieux qu'une progression linéaire qui s'arrête net.
          setProgress(1 - Math.pow(1 - t, 3));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [duration, reducedMotion]);

  const value = reducedMotion ? to : Math.round(to * progress);

  return (
    <span ref={ref}>
      {value.toLocaleString("fr-FR")}
      {suffix}
    </span>
  );
}
