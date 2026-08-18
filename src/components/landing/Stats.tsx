"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";

function StatCard({
  value,
  staticText,
  staticSub,
  suffix = "+",
  label,
  delay = 0,
  valueClassName,
}: {
  value?: number;
  staticText?: string;
  staticSub?: string;
  suffix?: string;
  label: string;
  delay?: number;
  valueClassName?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [display, setDisplay] = useState(staticText ?? "0");

  useEffect(() => {
    if (staticText !== undefined) return;
    const el = ref.current;
    if (el === null || value === undefined) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = value;
          const dur = 1400;
          const t0 = performance.now();
          const tick = (t: number) => {
            const p = Math.min((t - t0) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(
              Math.round(target * eased).toLocaleString("fr-FR") +
                (p === 1 ? suffix : ""),
            );
            if (p < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          io.unobserve(el);
        });
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, staticText, suffix]);

  return (
    <Reveal delay={delay} className="rounded-3xl border-2 border-border bg-card p-6 text-center shadow-hard-sm">
      <p className={`font-display text-4xl font-extrabold sm:text-5xl ${valueClassName ?? "text-foreground"}`}>
        <span ref={ref}>{display}</span>
        {staticSub !== undefined && (
          <span className="align-top text-2xl">{staticSub}</span>
        )}
      </p>
      <p className="mt-1 font-semibold text-muted-foreground">{label}</p>
    </Reveal>
  );
}

/// Chiffres clés de la plateforme (compteurs animés au défilement).
export function Stats({
  products = 12000,
  shops = 850,
  cities = 14,
}: {
  products?: number;
  shops?: number;
  cities?: number;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        <StatCard
          value={products}
          label="produits en ligne"
          valueClassName="text-primary"
        />
        <StatCard
          value={shops}
          label="boutiques actives"
          delay={0.08}
          valueClassName="text-secondary"
        />
        <StatCard
          value={cities}
          label="villes couvertes"
          delay={0.16}
          valueClassName="text-foreground"
        />
        <StatCard
          staticText="4,8"
          staticSub="/5"
          label="note moyenne des avis"
          delay={0.24}
          valueClassName="text-accent-dark"
        />
      </div>
    </section>
  );
}
