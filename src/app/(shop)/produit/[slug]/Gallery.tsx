"use client";

import { useRef, useState } from "react";
import { cx } from "@/components/ui";

/// Galerie : grande scène avec zoom qui suit le pointeur (loupe), vignettes
/// cliquables en dessous. Sur tactile, le zoom est désactivé (pas de survol),
/// les vignettes suffisent.
export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  if (images.length === 0) return <div className="grid aspect-square place-items-center rounded-lg bg-muted text-muted-foreground">Pas d&apos;image</div>;
  const src = images[i] ?? images[0]!;
  return (
    <div className="space-y-3">
      <div
        ref={ref}
        className="scene group relative cursor-zoom-in overflow-hidden rounded-[18px] p-10 sm:p-14"
        onMouseMove={(e) => {
          const r = ref.current?.getBoundingClientRect();
          if (!r) return;
          ref.current!.style.setProperty("--px", `${((e.clientX - r.left) / r.width) * 100}%`);
          ref.current!.style.setProperty("--py", `${((e.clientY - r.top) / r.height) * 100}%`);
        }}
      >
        <div className="relative aspect-square">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={src} src={src} alt={title} className="product-img zoom-img enter-up relative z-10 h-full w-full object-contain" />
          <span aria-hidden className="floor-shadow" />
        </div>
        {images.length > 1 && <span className="absolute bottom-4 right-4 z-20 rounded-full bg-black/55 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">{i + 1} / {images.length}</span>}
      </div>
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1" role="tablist" aria-label="Photos du produit">
          {images.map((s, k) => (
            <button key={s} type="button" role="tab" aria-selected={k === i} aria-label={`Photo ${k + 1}`} onClick={() => setI(k)} className={cx("scene press relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-md border-2 p-2 transition-colors", k === i ? "border-accent" : "border-transparent hover:border-border-strong")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s} alt="" loading="lazy" className="relative z-10 h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
