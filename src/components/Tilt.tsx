"use client";

import { useCallback, useEffect, useRef } from "react";

/// Relief 3D au pointeur (adapté d'« Optimized Tilt Card », 21st.dev).
/// Souris : inclinaison + reflet or qui suit. Tactile : même chose tant
/// que le doigt reste posé, puis retour. Tout passe par des variables CSS
/// mises à jour dans un requestAnimationFrame — aucun re-rendu React.
const MAX = 9;

export function Tilt({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    if (hide.current !== null) clearTimeout(hide.current);
  }, []);

  const set = useCallback((px: number, py: number, rx: number, ry: number, s: number) => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--px", `${px}%`);
    el.style.setProperty("--py", `${py}%`);
    el.style.setProperty("--rx", `${rx}deg`);
    el.style.setProperty("--ry", `${ry}deg`);
    el.style.setProperty("--ts", `${s}`);
  }, []);

  const update = useCallback((x: number, y: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100));
    const py = Math.max(0, Math.min(100, ((y - r.top) / r.height) * 100));
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => set(px, py, ((py - 50) / 50) * -MAX, ((px - 50) / 50) * MAX, 1.03));
  }, [set]);

  const reset = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--ts", "1");
    });
  }, []);

  return (
    <div
      ref={ref}
      className={`tilt relative ${className}`}
      onMouseMove={(e) => update(e.clientX, e.clientY)}
      onMouseLeave={reset}
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (!t) return;
        if (hide.current !== null) clearTimeout(hide.current);
        update(t.clientX, t.clientY);
        ref.current?.setAttribute("data-touch", "1");
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (t) update(t.clientX, t.clientY);
      }}
      onTouchEnd={() => {
        reset();
        hide.current = setTimeout(() => ref.current?.removeAttribute("data-touch"), 400);
      }}
      onTouchCancel={reset}
    >
      {children}
      <span aria-hidden className="sheen rounded-[inherit]" />
    </div>
  );
}
